package dev.kuku.taskinator.domains.team.internal

import com.github.f4b6a3.uuid.UuidCreator
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.team.ProjectTeam
import dev.kuku.taskinator.domains.team.TeamNameConflictException
import dev.kuku.taskinator.domains.team.UpdateTeamFields
import org.jetbrains.exposed.v1.core.*
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

@Repository
class TeamQueriesExposed(private val jdbcTemplate: JdbcTemplate) : TeamQueries {

    private val MAX_DEPTH = 50

    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeam(
        projectId: String,
        userId: String,
        teamName: String,
        parentTeamId: String?
    ): ProjectTeam? {
        val projectUuid = Uuid.parse(projectId)
        val userUuid = Uuid.parse(userId)
        val parentUuid = parentTeamId?.let { Uuid.parse(it) }
        val now = LocalDateTime.now(ZoneOffset.UTC)
        val teamUuid = UuidCreator.getTimeOrderedEpoch().toKotlinUuid()
        val closureUuid = UuidCreator.getTimeOrderedEpoch().toKotlinUuid()

        /**
         * ATOMIC 1-CALL SECURE INSERT:
         * Performs security validation, parent validation, and insertion in one DB call.
         *
         * Visualizing the CTE (Common Table Expression):
         * 
         * 1. THE "BOUNCER" (Security Check): 
         *    Checks if 'userId' is the Owner (Projects table) OR a Member (ProjectMembers table).
         * 
         * 2. THE "FAMILY TREE" (Parent Check): 
         *    If a Parent ID is given, it MUST exist in the Closure Table for THIS Project.
         *    This prevents "kidnapping" a team from another project.
         * 
         * 3. THE "STRETCH" (Depth Check): 
         *    Checks if the parent's current depth is < 49 (MAX_DEPTH - 1).
         *
         * FLOW:
         * [ Input ] -> [ Security & Parent Validation ] -> [ Insert Team ] -> [ Insert Self-Reference ]
         *      |                    |                         |                      |
         *      +----(One Trip)------+-------------------------+----------------------+
         *
         * Efficiency: 1 round-trip. No data loaded into app memory for validation.
         */
        val sql = """
            WITH inserted_team AS (
                INSERT INTO project_teams (id, fk_project_id, fk_parent_team_id, team_name, created_at, version)
                SELECT ?::uuid, ?::uuid, ?::uuid, ?, ?, 0
                WHERE (
                    EXISTS (SELECT 1 FROM projects WHERE id = ?::uuid AND fk_owner_id = ?::uuid)
                    OR EXISTS (SELECT 1 FROM project_members WHERE fk_project_id = ?::uuid AND fk_member_id = ?::uuid)
                )
                AND NOT EXISTS (
                    SELECT 1 FROM project_team_closure 
                    WHERE fk_child_id = ?::uuid AND fk_project_id = ?::uuid AND depth >= ? - 1
                )
                AND (?::uuid IS NULL OR EXISTS (SELECT 1 FROM project_team_closure WHERE fk_child_id = ?::uuid AND fk_project_id = ?::uuid))
                RETURNING id, fk_project_id, created_at
            )
            INSERT INTO project_team_closure (id, fk_project_id, fk_team_id, fk_child_id, depth, created_at)
            SELECT ?::uuid, fk_project_id, id, id, 0, created_at
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
                projectUuid.toJavaUuid(), // Security: Owner check
                userUuid.toJavaUuid(),
                projectUuid.toJavaUuid(), // Security: Member check
                userUuid.toJavaUuid(),
                parentUuid?.toJavaUuid(), // Depth check
                projectUuid.toJavaUuid(),
                MAX_DEPTH,
                parentUuid?.toJavaUuid(), // Parent Existence & Project Match
                parentUuid?.toJavaUuid(),
                projectUuid.toJavaUuid(),
                closureUuid.toJavaUuid()
            )

            if (rowsAffected == 0) {
                // Happy path failed, run diagnostics
                val ownerId = findProjectOwner(projectId)
                val isMember = filterProjectMembers(projectId, listOf(userId)).isNotEmpty()

                if (ownerId == null) throw IllegalArgumentException("Project not found.")
                if (ownerId != userId && !isMember) throw IllegalArgumentException("Unauthorized: User is not a member of the project.")

                if (parentUuid != null) {
                    val parentDepth = ProjectTeamClosure
                        .selectAll()
                        .where { (ProjectTeamClosure.childId eq parentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
                        .orderBy(ProjectTeamClosure.depth to SortOrder.DESC, ProjectTeamClosure.id to SortOrder.ASC)
                        .limit(1)
                        .map { it[ProjectTeamClosure.depth] }
                        .singleOrNull()
                        ?: throw IllegalArgumentException("Parent team '$parentTeamId' not found in this project.")

                    if (parentDepth >= MAX_DEPTH - 1) {
                        throw IllegalArgumentException("Maximum team hierarchy depth reached ($MAX_DEPTH).")
                    }
                }
                return null
            }
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true ||
                e.message?.contains("duplicate", ignoreCase = true) == true
            ) {
                throw TeamNameConflictException("Team with name '$teamName' already exists in this project.")
            }
            throw e
        }

        return ProjectTeam(
            id = teamUuid.toString(),
            name = teamName,
            projectId = projectId,
            parentTeamId = parentTeamId,
            createdAt = Date.from(now.toInstant(ZoneOffset.UTC)),
            updatedAt = Date.from(now.toInstant(ZoneOffset.UTC))
        )
    }

    /**
     * ATOMIC HIERARCHY COPY (The "Bulk Inherit"):
     * 
     * 1. THE "ANCESTRY" (Select): Finds every existing path leading to the parent.
     * 2. THE "EXTENSION" (Insert): Clones those paths and adds +1 depth for the new child.
     * 
     * FLOW:
     * [ Parent's Ancestors ] -> [ Increment Depth ] -> [ New Team's Ancestors ]
     *
     * Efficiency: O(1) app complexity. All inheritance happens inside the DB.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun computeTeamHierarchy(projectId: String, teamId: String, parentTeamId: String) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val parentUuid = Uuid.parse(parentTeamId)
        val now = LocalDateTime.now(ZoneOffset.UTC)

        val sql = """
            INSERT INTO project_team_closure (id, fk_project_id, fk_team_id, fk_child_id, depth, created_at)
            SELECT gen_random_uuid(), fk_project_id, fk_team_id, ?, depth + 1, ?
            FROM project_team_closure
            WHERE fk_child_id = ? AND fk_project_id = ?
            ON CONFLICT DO NOTHING
        """.trimIndent()

        jdbcTemplate.update(
            sql,
            teamUuid.toJavaUuid(),
            now,
            parentUuid.toJavaUuid(),
            projectUuid.toJavaUuid()
        )
    }


    @OptIn(ExperimentalUuidApi::class)
    override fun updateTeam(
        projectId: String,
        teamId: String,
        toUpdate: UpdateTeamFields
    ): Boolean {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)
        val now = LocalDateTime.now(ZoneOffset.UTC)

        try {
            /**
             * ATOMIC SECURE UPDATE (The "Moving Day" Logic):
             * 
             * 1. THE "LOCK" (Optimistic Locking): Matches version to prevent concurrent edits.
             * 2. THE "BOUNCER" (Project Guard): New parent must belong to the same Project.
             * 3. THE "HEIGHT LIMIT" (Depth Guard): New parent depth must be < 49 (MAX_DEPTH - 1).
             * 4. THE "TIME PARADOX" (Cycle Detection): Prevents moving a team under its own descendant.
             * 
             * FLOW:
             * [ Request ] -> [ Version + Project + Depth + Cycle Checks ] -> [ Update Team ]
             *      |                                |                          |
             *      +---------------------------(One Trip)----------------------+
             */
            val rowsAffected = if (toUpdate.parentTeamId != null) {
                val newParentUuid = Uuid.parse(toUpdate.parentTeamId)

                val sql = """
                    UPDATE project_teams 
                    SET fk_parent_team_id = ?, 
                        team_name = COALESCE(?, team_name), 
                        version = version + 1, 
                        updated_at = ?
                    WHERE id = ? AND fk_project_id = ? AND version = ?
                    AND EXISTS (
                        SELECT 1 FROM project_team_closure 
                        WHERE fk_child_id = ?::uuid AND fk_project_id = ?::uuid AND depth < ? - 1
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM project_team_closure 
                        WHERE fk_team_id = ? AND fk_child_id = ? AND fk_project_id = ?
                    )
                """.trimIndent()

                jdbcTemplate.update(
                    sql,
                    newParentUuid.toJavaUuid(),
                    toUpdate.teamName,
                    now,
                    teamUuid.toJavaUuid(),
                    projectUuid.toJavaUuid(),
                    toUpdate.version,
                    newParentUuid.toJavaUuid(),
                    projectUuid.toJavaUuid(),
                    MAX_DEPTH,
                    teamUuid.toJavaUuid(),
                    newParentUuid.toJavaUuid(),
                    projectUuid.toJavaUuid()
                )
            } else {
                // Standard DSL update for name-only changes
                ProjectTeams.update({
                    (ProjectTeams.id eq teamUuid) and
                            (ProjectTeams.projectId eq projectUuid) and
                            (ProjectTeams.version eq toUpdate.version)
                }) {
                    if (toUpdate.teamName != null) it[teamName] = toUpdate.teamName
                    it[version] = toUpdate.version + 1
                    it[updatedAt] = now
                }
            }

            if (rowsAffected == 0) {
                // Happy path failed, run diagnostics to provide clear domain errors
                if (toUpdate.parentTeamId != null) {
                    val newParentUuid = Uuid.parse(toUpdate.parentTeamId)
                    val exists = ProjectTeams.selectAll()
                        .where { (ProjectTeams.id eq teamUuid) and (ProjectTeams.projectId eq projectUuid) and (ProjectTeams.version eq toUpdate.version) }
                        .any()
                    if (!exists) return false // Concurrent modification or team not found

                    val parentDepth = ProjectTeamClosure
                        .selectAll()
                        .where { (ProjectTeamClosure.childId eq newParentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
                        .orderBy(ProjectTeamClosure.depth to SortOrder.DESC, ProjectTeamClosure.id to SortOrder.ASC)
                        .limit(1)
                        .map { it[ProjectTeamClosure.depth] }
                        .singleOrNull()
                        ?: throw IllegalArgumentException("Parent team '${toUpdate.parentTeamId}' not found.")

                    if (parentDepth >= MAX_DEPTH - 1) {
                        throw IllegalArgumentException("Maximum team hierarchy depth reached ($MAX_DEPTH).")
                    }

                    val isDescendant = ProjectTeamClosure.selectAll()
                        .where { (ProjectTeamClosure.teamId eq teamUuid) and (ProjectTeamClosure.childId eq newParentUuid) and (ProjectTeamClosure.projectId eq projectUuid) }
                        .any()
                    if (isDescendant) {
                        throw IllegalArgumentException("Cycle detected: Cannot move team under its own descendant.")
                    }
                }
                return false
            }
            return true
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true ||
                e.message?.contains("duplicate", ignoreCase = true) == true
            ) {
                throw TeamNameConflictException("Team with name '${toUpdate.teamName}' already exists.")
            }
            throw e
        }
    }

    /**
     * ATOMIC TEAM DELETE (1-Call):
     * Deletes the team and its associated hierarchy data in the closure table.
     * Members and sub-tasks are cleaned up asynchronously via events.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTeam(projectId: String, teamId: String, version: Long): Int {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)

        val sql = """
            WITH deleted_team AS (
                DELETE FROM project_teams 
                WHERE id = ? AND fk_project_id = ? AND version = ?
                RETURNING id
            ),
            deleted_closure AS (
                DELETE FROM project_team_closure 
                WHERE (fk_team_id IN (SELECT id FROM deleted_team) OR fk_child_id IN (SELECT id FROM deleted_team))
            )
            SELECT COUNT(*) FROM deleted_team
        """.trimIndent()

        return jdbcTemplate.queryForObject(
            sql,
            Int::class.java,
            teamUuid.toJavaUuid(),
            projectUuid.toJavaUuid(),
            version
        ) ?: 0
    }

    /**
     * PAGINATED TEAM DISCOVERY:
     * Fetches teams for a project, sorted by newest first.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findTeamsByProject(projectId: String, limit: Int, offset: Int): List<ProjectTeam> {
        val projectUuid = Uuid.parse(projectId)

        return ProjectTeams.selectAll()
            .where { ProjectTeams.projectId eq projectUuid }
            .orderBy(ProjectTeams.createdAt to SortOrder.DESC, ProjectTeams.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it.toProjectTeam() }
    }

    /**
     * MEMBER FILTER (The "Guest List Check"):
     * Takes a list of IDs and returns only those that are valid members of the project.
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
     * SINGLE TEAM LOOKUP:
     * Fetches details of a specific team within a project.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findTeamById(projectId: String, teamId: String): ProjectTeam? {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)

        return ProjectTeams.selectAll()
            .where { (ProjectTeams.projectId eq projectUuid) and (ProjectTeams.id eq teamUuid) }
            .map { it.toProjectTeam() }
            .singleOrNull()
    }

    /**
     * PROJECT OWNER LOOKUP:
     * Identifies the ultimate authority of a project.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectOwner(projectId: String): String? {
        val projectUuid = Uuid.parse(projectId)
        return dev.kuku.taskinator.domains.project.internal.Projects.selectAll()
            .where { dev.kuku.taskinator.domains.project.internal.Projects.id eq projectUuid }
            .map { it[dev.kuku.taskinator.domains.project.internal.Projects.ownerId].toString() }
            .singleOrNull()
    }

    override fun getChildrenTeam(
        projectId: String,
        userId: String,
        teamId: String,
        limit: Int,
        offset: Int
    ): List<ProjectTeam> {
        throw NotImplementedError("WIP")
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun insertTeamMembers(
        projectId: String,
        teamId: String,
        memberIds: List<String>
    ) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val memberUuids = memberIds.map { Uuid.parse(it).toJavaUuid() }.toTypedArray()
        val now = LocalDateTime.now(ZoneOffset.UTC)

        /**
         * ATOMIC SECURE BATCH INSERT (The "Project Filter"):
         * 
         * 1. THE "GATE" (Subquery): Only IDs that exist in 'project_members' (or the Owner) pass through.
         * 2. THE "STAMP" (Insert): New team membership records are created from the filtered list.
         * 
         * Logic: We never trust the input 'memberIds' directly. We treat them as a "request" 
         * and only grant access if the database proves they are already part of the Project.
         *
         * FLOW:
         * [ Input IDs ] -> [ Project & Owner Filter ] -> [ Insert into Team Members ]
         *      |                    |                             |
         *      +----------------(One DB Trip)---------------------+
         */
        val sql = """
            INSERT INTO project_team_members (id, fk_project_id, fk_team_id, fk_member_id, username, display_name, created_at)
            SELECT gen_random_uuid(), fk_project_id, ?, fk_member_id, username, display_name, ?
            FROM (
                SELECT fk_project_id, fk_member_id, username, display_name 
                FROM project_members 
                WHERE fk_project_id = ? AND fk_member_id = ANY(?)
                UNION ALL
                SELECT id, fk_owner_id, 'owner', 'Project Owner'
                FROM projects
                WHERE id = ? AND fk_owner_id = ANY(?)
            ) sub
            ON CONFLICT (fk_project_id, fk_team_id, fk_member_id) DO NOTHING
        """.trimIndent()

        jdbcTemplate.update(sql) { ps ->
            ps.setObject(1, teamUuid.toJavaUuid())
            ps.setTimestamp(2, java.sql.Timestamp.valueOf(now))
            ps.setObject(3, projectUuid.toJavaUuid())
            ps.setArray(4, ps.connection.createArrayOf("uuid", memberUuids))
            ps.setObject(5, projectUuid.toJavaUuid())
            ps.setArray(6, ps.connection.createArrayOf("uuid", memberUuids))
        }
    }

    /**
     * BATCH MEMBER REMOVAL:
     * Removes specified members from a team context.
     */
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
    private fun ResultRow.toProjectTeam() = ProjectTeam(
        id = this[ProjectTeams.id].value.toString(),
        name = this[ProjectTeams.teamName],
        projectId = this[ProjectTeams.projectId].toString(),
        parentTeamId = this[ProjectTeams.parentTeamId]?.toString(),
        createdAt = Date.from(this[ProjectTeams.createdAt].toInstant(ZoneOffset.UTC)),
        updatedAt = this[ProjectTeams.updatedAt]?.let { Date.from(it.toInstant(ZoneOffset.UTC)) }
    )
}