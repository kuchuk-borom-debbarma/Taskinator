package dev.kuku.taskinator.domains.team.internal

import com.github.f4b6a3.uuid.UuidCreator
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.team.Team
import dev.kuku.taskinator.domains.team.TeamAlreadyLinkedException
import dev.kuku.taskinator.domains.team.TeamNameConflictException
import dev.kuku.taskinator.domains.team.UpdateTeamFields
import io.github.oshai.kotlinlogging.KotlinLogging
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.*
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlin.uuid.toJavaUuid
import kotlin.uuid.toKotlinUuid

private val log = KotlinLogging.logger {}

@Repository
class TeamQueriesExposed(private val jdbcTemplate: JdbcTemplate) : TeamQueries {

    private val MAX_DEPTH = 50

    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeam(
        projectId: String,
        teamName: String,
        parentTeamId: String?
    ): Team? {
        val projectUuid = Uuid.parse(projectId)
        val parentUuid = parentTeamId?.let { Uuid.parse(it) }
        val now = LocalDateTime.now(ZoneOffset.UTC)
        val teamUuid = UuidCreator.getTimeOrderedEpoch().toKotlinUuid()
        val closureUuid = UuidCreator.getTimeOrderedEpoch().toKotlinUuid()

        /**
         * ATOMIC 1-CALL OPTIMIZATION:
         * We use a PostgreSQL CTE (Common Table Expression) to perform validation and insertion across multiple tables
         * in a single round-trip.
         *
         * 1. 'inserted_team' block:
         *    - Checks if the parent (if provided) exists and if the depth limit (MAX_DEPTH) is not exceeded.
         *    - Only inserts into 'project_teams' if these conditions are met.
         *    - Returns the inserted ID and metadata.
         *
         * 2. Final INSERT block:
         *    - Takes the output from 'inserted_team'.
         *    - Inserts the mandatory self-reference (depth 0) into 'project_team_closure'.
         *
         * Performance: Reduces 3 DB calls (Check Depth -> Insert Team -> Insert Closure) to 1.
         * Diagnostic: If 0 rows are affected, we fall back to DSL queries to identify the specific error (e.g. non-existent parent).
         */
        val sql = """
            WITH inserted_team AS (
                INSERT INTO project_teams (id, fk_project_id, fk_parent_team_id, team_name, created_at, version)
                SELECT ?, ?, ?, ?, ?, 0
                WHERE NOT EXISTS (
                    SELECT 1 FROM project_team_closure 
                    WHERE fk_child_id = ? AND fk_project_id = ? AND depth >= ?
                )
                AND (? IS NULL OR EXISTS (SELECT 1 FROM project_team_closure WHERE fk_child_id = ? AND fk_project_id = ?))
                RETURNING id, fk_project_id, created_at
            )
            INSERT INTO project_team_closure (id, fk_project_id, fk_team_id, fk_child_id, depth, created_at)
            SELECT ?, fk_project_id, id, id, 0, created_at
            FROM inserted_team
        """.trimIndent()

        try {
            val rowsAffected = jdbcTemplate.update(
                sql,
                teamUuid.toJavaUuid(),
                projectUuid.toJavaUuid(),
                parentUuid?.toJavaUuid(),
                teamName,
                now,
                parentUuid?.toJavaUuid(),
                projectUuid.toJavaUuid(),
                MAX_DEPTH,
                parentUuid?.toJavaUuid(),
                parentUuid?.toJavaUuid(),
                projectUuid.toJavaUuid(),
                closureUuid.toJavaUuid()
            )

            if (rowsAffected == 0) {
                // Happy path failed (0 rows inserted), perform diagnostics
                if (parentUuid != null) {
                    val parentDepth = ProjectTeamClosure
                        .selectAll()
                        .where { (ProjectTeamClosure.childId eq parentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
                        .orderBy(ProjectTeamClosure.depth to SortOrder.DESC, ProjectTeamClosure.id to SortOrder.ASC)
                        .limit(1)
                        .map { it[ProjectTeamClosure.depth] }
                        .singleOrNull() ?: throw IllegalArgumentException("Parent team '$parentTeamId' not found.")

                    if (parentDepth >= MAX_DEPTH) {
                        throw IllegalArgumentException("Maximum team hierarchy depth reached ($MAX_DEPTH).")
                    }
                }
                return null
            }
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw TeamNameConflictException("Team with name '$teamName' already exists in this project.")
            }
            throw e
        }

        return Team(
            id = teamUuid.toString(),
            name = teamName,
            projectId = projectId,
            parentTeamId = parentTeamId,
            createdAt = Date.from(now.toInstant(ZoneOffset.UTC)),
            updatedAt = Date.from(now.toInstant(ZoneOffset.UTC))
        )
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun computeTeamHierarchy(projectId: String, teamId: String, parentTeamId: String) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val parentUuid = Uuid.parse(parentTeamId)
        val now = LocalDateTime.now(ZoneOffset.UTC)

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
                this[ProjectTeamClosure.createdAt] = now
            }
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeamMembersFromProject(projectId: String, teamId: String, memberIds: List<String>) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val memberUuids = memberIds.map { Uuid.parse(it) }
        val now = LocalDateTime.now(ZoneOffset.UTC)

        val validMembers = ProjectMembers
            .selectAll()
            .where { (ProjectMembers.projectId eq projectUuid) and (ProjectMembers.memberId inList memberUuids) }
            .map { 
                Triple(it[ProjectMembers.memberId], it[ProjectMembers.username], it[ProjectMembers.displayName])
            }.toMutableList()

        val ownerId = findProjectOwner(projectId)
        if (ownerId != null && memberIds.contains(ownerId)) {
            projectDataAddOwner(projectData = validMembers, ownerId = ownerId)
        }

        if (validMembers.isNotEmpty()) {
            ProjectTeamMembers.batchInsert(validMembers, ignore = true, shouldReturnGeneratedValues = false) { (mId, uname, dName) ->
                this[ProjectTeamMembers.projectId] = projectUuid
                this[ProjectTeamMembers.teamId] = teamUuid
                this[ProjectTeamMembers.memberId] = mId
                this[ProjectTeamMembers.username] = uname
                this[ProjectTeamMembers.displayName] = dName
                this[ProjectTeamMembers.createdAt] = now
            }
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    private fun projectDataAddOwner(projectData: MutableList<Triple<Uuid, String, String>>, ownerId: String) {
        val ownerUuid = Uuid.parse(ownerId)
        if (projectData.none { it.first == ownerUuid }) {
            projectData.add(Triple(ownerUuid, "owner", "Project Owner"))
        }
    }

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
                throw TeamAlreadyLinkedException("Team already has a parent.")
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

    /**
     * ATOMIC OPTIMISTIC DELETE:
     * We delete the team record FIRST. If this fails (returns 0), we do not touch the hierarchy.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTeam(projectId: String, teamId: String, version: Long): Int {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)

        val deletedRows = ProjectTeams.deleteWhere {
            (ProjectTeams.id eq teamUuid) and 
            (ProjectTeams.projectId eq projectUuid) and 
            (ProjectTeams.version eq version)
        }

        // Only cleanup hierarchy if the team was actually deleted
        if (deletedRows > 0) {
            ProjectTeamClosure.deleteWhere {
                (ProjectTeamClosure.projectId eq projectUuid) and 
                ((ProjectTeamClosure.teamId eq teamUuid) or (ProjectTeamClosure.childId eq teamUuid))
            }
        }

        return deletedRows
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findTeamsByProject(projectId: String, limit: Int, offset: Int): List<Team> {
        val projectUuid = Uuid.parse(projectId)
        
        return ProjectTeams.selectAll()
            .where { ProjectTeams.projectId eq projectUuid }
            .orderBy(ProjectTeams.createdAt to SortOrder.DESC, ProjectTeams.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it.toTeam() }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun filterProjectMembers(projectId: String, memberIds: List<String>): List<String> {
        val projectUuid = Uuid.parse(projectId)
        val memberUuids = memberIds.map { Uuid.parse(it) }

        return ProjectMembers.selectAll()
            .where { (ProjectMembers.projectId eq projectUuid) and (ProjectMembers.memberId inList memberUuids) }
            .map { it[ProjectMembers.memberId].toString() }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectOwner(projectId: String): String? {
        val projectUuid = Uuid.parse(projectId)
        return dev.kuku.taskinator.domains.project.internal.Projects.selectAll()
            .where { dev.kuku.taskinator.domains.project.internal.Projects.id eq projectUuid }
            .map { it[dev.kuku.taskinator.domains.project.internal.Projects.ownerId].toString() }
            .singleOrNull()
    }

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