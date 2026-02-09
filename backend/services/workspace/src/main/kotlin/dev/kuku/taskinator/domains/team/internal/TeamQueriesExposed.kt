package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.team.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.*
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

private val log = KotlinLogging.logger {}

@Repository
class TeamQueriesExposed : TeamQueries {

    private val MAX_DEPTH = 50

    /**
     * Performs a lean team insertion optimized for high-throughput.
     * 
     * GUARDIAN: Before insertion, it checks the max depth of the parent in the Closure Table.
     * PERFORMANCE: Only inserts the team and a 'depth 0' self-reference.
     * SCALABILITY: The ancestor paths are deferred to [computeTeamHierarchy].
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeam(
        projectId: String,
        teamName: String,
        parentTeamId: String?
    ): Team? {
        val projectUuid = Uuid.parse(projectId)
        val parentUuid = parentTeamId?.let { Uuid.parse(it) }

        // 1. Depth Guard: Protects the database from malicious recursive trees.
        // Tie-breaker: Always use ID to ensure deterministic depth calculation.
        if (parentUuid != null) {
            val currentDepth = ProjectTeamClosure
                .selectAll()
                .where { (ProjectTeamClosure.childId eq parentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
                .orderBy(ProjectTeamClosure.depth to SortOrder.DESC, ProjectTeamClosure.id to SortOrder.ASC)
                .limit(1)
                .map { it[ProjectTeamClosure.depth] }
                .singleOrNull() ?: 0

            if (currentDepth >= MAX_DEPTH) {
                throw IllegalArgumentException("Maximum team hierarchy depth reached.")
            }
        }

        // 2. Core Insert: Create the team record.
        val generatedId = try {
            ProjectTeams.insertAndGetId {
                it[ProjectTeams.projectId] = projectUuid
                it[ProjectTeams.teamName] = teamName
                it[ProjectTeams.parentTeamId] = parentUuid
            }
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw TeamNameConflictException("Team with name '$teamName' already exists in this project.")
            }
            throw e
        }

        val teamUuid = generatedId.value

        // 3. Sync Hierarchy Visibility:
        // Every team must exist in the closure table at depth 0 immediately 
        // to be visible to subsequent 'Depth Guards' or direct parent queries.
        ProjectTeamClosure.insert {
            it[ProjectTeamClosure.projectId] = projectUuid
            it[ProjectTeamClosure.teamId] = teamUuid
            it[ProjectTeamClosure.childId] = teamUuid
            it[ProjectTeamClosure.depth] = 0
        }

        return ProjectTeams.selectAll()
            .where { ProjectTeams.id eq generatedId }
            .map { it.toTeam() }
            .singleOrNull()
    }

    /**
     * Async Hierarchy Builder: Populates the Closure Table by copying ancestral paths.
     * 
     * RELATIONSHIP LOGIC:
     * - Finds all ancestors of the parent [parentTeamId].
     * - Copies them as ancestors of the new [teamId], incrementing depth by 1.
     * - This transforms a simple tree into a fully-indexed path matrix for O(1) traversal.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun computeTeamHierarchy(projectId: String, teamId: String, parentTeamId: String) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val parentUuid = Uuid.parse(parentTeamId)

        val ancestors = ProjectTeamClosure.selectAll()
            .where { (ProjectTeamClosure.childId eq parentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
            .map { 
                Triple(it[ProjectTeamClosure.teamId], it[ProjectTeamClosure.depth], it[ProjectTeamClosure.projectId]) 
            }

        if (ancestors.isNotEmpty()) {
            ProjectTeamClosure.batchInsert(ancestors, ignore = true) { (ancestorId, depth, pId) ->
                this[ProjectTeamClosure.projectId] = pId
                this[ProjectTeamClosure.teamId] = ancestorId
                this[ProjectTeamClosure.childId] = teamUuid
                this[ProjectTeamClosure.depth] = depth + 1
            }
        }
    }

    /**
     * Updates a team with strict domain rules.
     * 
     * RULES:
     * - Optimistic Locking: WHERE clause check on 'version'.
     * - Integrity: Cannot link a team to a parent if it already has one (One Parent Rule).
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun updateTeam(
        projectId: String,
        teamId: String,
        toUpdate: UpdateTeamFields
    ): Boolean {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)

        if (toUpdate.parentTeamId != null) {
            val hasParent = ProjectTeams
                .selectAll()
                .where { (ProjectTeams.id eq teamUuid) and (ProjectTeams.projectId eq projectUuid) }
                .any { it[ProjectTeams.parentTeamId] != null }
            
            if (hasParent) {
                throw TeamAlreadyLinkedException("Team is already linked to a parent.")
            }
        }

        try {
            val updatedRows = ProjectTeams.update({
                (ProjectTeams.id eq teamUuid) and
                (ProjectTeams.projectId eq projectUuid) and
                (ProjectTeams.version eq toUpdate.version)
            }) {
                if (toUpdate.teamName != null) it[teamName] = toUpdate.teamName
                if (toUpdate.parentTeamId != null) it[parentTeamId] = Uuid.parse(toUpdate.parentTeamId)
                
                it[version] = toUpdate.version + 1
                it[updatedAt] = LocalDateTime.now(ZoneOffset.UTC)
            }
            return updatedRows > 0
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw TeamNameConflictException("Team name conflict.")
            }
            throw e
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTeam(projectId: String, teamId: String): Boolean {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)

        // CLEANUP: Remove all hierarchy paths associated with this team.
        ProjectTeamClosure.deleteWhere {
            (ProjectTeamClosure.projectId eq projectUuid) and 
            ((ProjectTeamClosure.teamId eq teamUuid) or (ProjectTeamClosure.childId eq teamUuid))
        }

        return ProjectTeams.deleteWhere {
            (ProjectTeams.id eq teamUuid) and (ProjectTeams.projectId eq projectUuid)
        } > 0
    }

    /**
     * Batch inserts members with denormalized user data for speed.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeamMembers(
        projectId: String,
        teamId: String,
        memberIds: List<String>
    ) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val now = LocalDateTime.now(ZoneOffset.UTC)

        ProjectTeamMembers.batchInsert(memberIds, ignore = true, shouldReturnGeneratedValues = false) { memberId ->
            this[ProjectTeamMembers.projectId] = projectUuid
            this[ProjectTeamMembers.teamId] = teamUuid
            this[ProjectTeamMembers.memberId] = Uuid.parse(memberId)
            
            this[ProjectTeamMembers.username] = "member_$memberId"
            this[ProjectTeamMembers.displayName] = "Member $memberId"
            this[ProjectTeamMembers.createdAt] = now
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTeamMembers(
        projectId: String,
        teamId: String,
        memberIds: List<String>
    ) {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)
        val memberUuids = memberIds.map { Uuid.parse(it) }

        ProjectTeamMembers.deleteWhere {
            (ProjectTeamMembers.projectId eq projectUuid) and
            (ProjectTeamMembers.teamId eq teamUuid) and
            (ProjectTeamMembers.memberId inList memberUuids)
        }
    }

    /**
     * Security Check: Filters out IDs that are NOT project members.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun filterProjectMembers(projectId: String, memberIds: List<String>): List<String> {
        val projectUuid = Uuid.parse(projectId)
        val memberUuids = memberIds.map { Uuid.parse(it) }

        return ProjectMembers.selectAll()
            .where { (ProjectMembers.projectId eq projectUuid) and (ProjectMembers.memberId inList memberUuids) }
            .map { it[ProjectMembers.memberId].toString() }
    }

    /**
     * Ownership Check: Finds the global owner of the project.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectOwner(projectId: String): String? {
        val projectUuid = Uuid.parse(projectId)
        return dev.kuku.taskinator.domains.project.internal.Projects.selectAll()
            .where { dev.kuku.taskinator.domains.project.internal.Projects.id eq projectUuid }
            .map { it[dev.kuku.taskinator.domains.project.internal.Projects.ownerId].toString() }
            .singleOrNull()
    }

    @OptIn(ExperimentalUuidApi::class)
    private fun ResultRow.toTeam() = Team(
        id = this[ProjectTeams.id].value.toString(),
        name = this[ProjectTeams.teamName],
        projectId = this[ProjectTeams.projectId].toString(),
        parentTeamId = this[ProjectTeams.parentTeamId]?.toString(),
        createdAt = Date.from(this[ProjectTeams.createdAt].toInstant(ZoneOffset.UTC)),
        updatedAt = this[ProjectTeams.updatedAt]?.let { Date.from(it.toInstant(ZoneOffset.UTC)) } ?: Date()
    )
}