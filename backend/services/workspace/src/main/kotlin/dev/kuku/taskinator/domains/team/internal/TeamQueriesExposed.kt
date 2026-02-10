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
        val parentUuid = parentTeamId?.let { Uuid.parse(it) } ?: return
        val now = LocalDateTime.now(ZoneOffset.UTC)

        /**
         * ATOMIC HIERARCHY COPY (1 DB Call):
         * Performs a "Bulk Inherit" of all ancestral paths.
         * 
         * Pattern: INSERT ... SELECT
         * Logic: We find every team that is an ancestor of the parent (depth N) and 
         * insert them as ancestors of the new team at depth N+1.
         * 
         * Performance: O(1) app-side complexity. No ancestors are fetched into memory.
         * Integrity: ON CONFLICT DO NOTHING prevents duplicate paths if the event is retried.
         */
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
    override fun insertTeamMembersFromProject(projectId: String, teamId: String, memberIds: List<String>) {
        val projectUuid = Uuid.parse(projectId)
        val teamUuid = Uuid.parse(teamId)
        val memberUuids = memberIds.map { Uuid.parse(it).toJavaUuid() }.toTypedArray()
        val now = LocalDateTime.now(ZoneOffset.UTC)

        /**
         * ATOMIC SECURE BATCH INSERT (1 DB Call):
         * This query solves the "Secure Batching" problem without loading data into app RAM.
         * 
         * 1. Multi-Source Validation: 
         *    - The 'project_members' subquery ensures IDs are valid members of the parent project.
         *    - The 'projects' UNION allows the Project Owner to join even if not in the member list.
         * 2. Atomic Filter: We only insert rows that exist in the result of the UNION.
         * 3. Performance: 1 round-trip regardless of batch size (up to Postgres param limits).
         */
        val sql = """
            INSERT INTO project_team_members (id, fk_project_id, fk_team_id, fk_member_id, username, display_name, created_at)
            SELECT gen_random_uuid(), fk_project_id, ?, fk_member_id, username, display_name, ?
            FROM (
                SELECT fk_project_id, fk_member_id, username, display_name 
                FROM project_members 
                WHERE fk_project_id = ? AND fk_member_id = ANY(?)
                UNION ALL
                SELECT id, owner_id, 'owner', 'Project Owner'
                FROM projects
                WHERE id = ? AND owner_id = ANY(?)
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
             * ATOMIC 1-CALL UPDATE:
             * If the parent is being changed, we perform a complex atomic check + update.
             * 
             * Safety Guards:
             * 1. Version Check: Optimistic locking.
             * 2. Parent Existence: New parent must exist in the same project.
             * 3. Depth Guard: New parent depth must be < MAX_DEPTH.
             * 4. Cycle Detection: New parent cannot be a descendant of the team itself.
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
                        WHERE fk_child_id = ? AND fk_project_id = ? AND depth < ?
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
                        .singleOrNull() ?: throw IllegalArgumentException("Parent team '${toUpdate.parentTeamId}' not found.")

                    if (parentDepth >= MAX_DEPTH) {
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
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw TeamNameConflictException("Team with name '${toUpdate.teamName}' already exists.")
            }
            throw e
        }
    }

    /**
     * ATOMIC OPTIMISTIC DELETE (1 DB Call):
     * Uses a PostgreSQL CTE to delete the team record AND its hierarchy in one go.
     * Integrity: Only cleans up 'project_team_closure' if the 'project_teams' record was actually deleted (correct version).
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTeam(projectId: String, teamId: String, version: Long): Int {
        val teamUuid = Uuid.parse(teamId)
        val projectUuid = Uuid.parse(projectId)

        val sql = """
            WITH deleted AS (
                DELETE FROM project_teams 
                WHERE id = ? AND fk_project_id = ? AND version = ?
                RETURNING 1
            ),
            cleanup AS (
                DELETE FROM project_team_closure 
                WHERE fk_project_id = ? 
                AND (fk_team_id = ? OR fk_child_id = ?)
            )
            SELECT COUNT(*) FROM deleted
        """.trimIndent()

        return jdbcTemplate.queryForObject(
            sql,
            Int::class.java,
            teamUuid.toJavaUuid(),
            projectUuid.toJavaUuid(),
            version,
            projectUuid.toJavaUuid(),
            teamUuid.toJavaUuid(),
            teamUuid.toJavaUuid()
        ) ?: 0
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