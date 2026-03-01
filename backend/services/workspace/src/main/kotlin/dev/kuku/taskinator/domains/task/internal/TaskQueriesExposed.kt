package dev.kuku.taskinator.domains.task.internal

import com.github.f4b6a3.uuid.UuidCreator
import dev.kuku.taskinator.domains.task.AssignTaskParam
import dev.kuku.taskinator.domains.task.ProjectTask
import dev.kuku.taskinator.domains.task.TaskToCreateParam
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.time.ZoneOffset
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlin.uuid.toJavaUuid
import kotlin.uuid.toKotlinUuid

/**
 * TaskQueriesExposed handles high-performance SQL operations using Spring JdbcTemplate.
 * 
 * DESIGN GOAL: "One Round Trip"
 * Every operation is written as a single, complex SQL statement to avoid multiple
 * database round-trips (N+1 queries), which is critical for 10k-1M RPS scale.
 */
@Repository
class TaskQueriesExposed(private val jdbcTemplate: JdbcTemplate) : TaskQueries {

    @OptIn(ExperimentalUuidApi::class)
    override fun insertTask(userId: String, toCreate: TaskToCreateParam, idempotencyKey: String, taskId: String?): ProjectTask? {
        // Use provided taskId or generate a new one if not provided
        val taskUuid = taskId?.let { Uuid.parse(it) } ?: UuidCreator.getTimeOrderedEpoch().toKotlinUuid()
        
        val projectUuid = Uuid.parse(toCreate.projectId)
        val userUuid = Uuid.parse(userId)
        val parentUuid = toCreate.parentTaskId?.let { Uuid.parse(it) }
        val now = LocalDateTime.now(ZoneOffset.UTC)

        /**
         * ATOMIC MULTI-RULE INSERTION
         */
        val sql = """
            INSERT INTO project_tasks (
                id, fk_project_id, fk_parent_task_id, fk_root_id, path, 
                fk_created_by, fk_assigned_team, fk_assigned_team_member, 
                title, description, status, lexo_rank, idempotency_key, created_at, version
            )
            SELECT 
                ?::uuid, p_id, parent_id, COALESCE(root_id, ?::uuid), 
                CASE 
                    WHEN parent_id IS NULL THEN ?::text 
                    ELSE parent_path || '/' || ? 
                END,
                ?::uuid, ?::uuid, ?::uuid, ?, ?, 'NOT STARTED', '0|hzzzzz:', ?, ?, 0
            FROM (
                SELECT 
                    proj.id as p_id,
                    parent.id as parent_id,
                    COALESCE(parent.fk_root_id, parent.id) as root_id,
                    parent.path as parent_path
                FROM projects proj
                LEFT JOIN project_tasks parent ON parent.id = ?::uuid AND parent.fk_project_id = proj.id
                WHERE proj.id = ?::uuid
                AND (
                    proj.fk_owner_id = ?::uuid 
                    OR EXISTS (SELECT 1 FROM project_members WHERE fk_project_id = proj.id AND fk_member_id = ?::uuid)
                )
                AND (?::uuid IS NULL OR parent.id IS NOT NULL)
            ) as valid_context
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING *
        """.trimIndent()

        val taskIdStr = taskUuid.toString()
        val result = jdbcTemplate.query(sql, { rs, _ ->
            ProjectTask(
                id = rs.getString("id"),
                projectId = rs.getString("fk_project_id"),
                parentTaskId = rs.getString("fk_parent_task_id"),
                rootId = rs.getString("fk_root_id"),
                path = rs.getString("path"),
                createdBy = rs.getString("fk_created_by"),
                title = rs.getString("title"),
                description = rs.getString("description"),
                assignedTeam = rs.getString("fk_assigned_team"),
                assignedTeamMember = rs.getString("fk_assigned_team_member"),
                status = rs.getString("status"),
                lexoRank = rs.getString("lexo_rank"),
                version = rs.getLong("version"),
                createdAt = rs.getTimestamp("created_at"),
                updatedAt = rs.getTimestamp("updated_at")
            )
        }, 
            taskUuid.toJavaUuid(),
            taskUuid.toJavaUuid(), 
            taskIdStr, 
            taskIdStr, 
            userUuid.toJavaUuid(),
            toCreate.assignedTeam?.let { Uuid.parse(it).toJavaUuid() },
            toCreate.assignedMember?.let { Uuid.parse(it).toJavaUuid() },
            toCreate.title,
            toCreate.description ?: "",
            idempotencyKey,
            now,
            parentUuid?.toJavaUuid(),
            projectUuid.toJavaUuid(),
            userUuid.toJavaUuid(),
            userUuid.toJavaUuid(),
            parentUuid?.toJavaUuid()
        )

        return result.firstOrNull() ?: taskId?.let { findTaskById(toCreate.projectId, it) }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun updateTaskStatus(projectId: String, userId: String, taskId: String, version: Long, status: String): Boolean {
        val now = LocalDateTime.now(ZoneOffset.UTC)
        val taskUuid = Uuid.parse(taskId).toJavaUuid()
        val projectUuid = Uuid.parse(projectId).toJavaUuid()
        val userUuid = Uuid.parse(userId).toJavaUuid()

        val sql = """
            UPDATE project_tasks
            SET status = ?, updated_at = ?, version = version + 1
            WHERE id = ? AND fk_project_id = ? AND version = ?
            AND (
                EXISTS (SELECT 1 FROM projects WHERE id = ? AND fk_owner_id = ?)
                OR fk_assigned_team_member = ?
                OR (
                    fk_assigned_team_member IS NULL 
                    AND fk_assigned_team IS NOT NULL
                    AND EXISTS (SELECT 1 FROM project_team_members WHERE fk_team_id = fk_assigned_team AND fk_member_id = ?)
                )
            )
        """.trimIndent()

        return jdbcTemplate.update(
            sql, 
            status, 
            now, 
            taskUuid, 
            projectUuid,
            version,
            projectUuid,
            userUuid,
            userUuid,
            userUuid
        ) > 0
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun assignTask(projectId: String, userId: String, taskId: String, version: Long, assignTo: AssignTaskParam): Boolean {
        val now = LocalDateTime.now(ZoneOffset.UTC)
        val taskUuid = Uuid.parse(taskId).toJavaUuid()
        val projectUuid = Uuid.parse(projectId).toJavaUuid()
        val userUuid = Uuid.parse(userId).toJavaUuid()

        val sql = """
            UPDATE project_tasks
            SET fk_assigned_team = ?, fk_assigned_team_member = ?, updated_at = ?, version = version + 1
            WHERE id = ? AND fk_project_id = ? AND version = ?
            AND (
                EXISTS (SELECT 1 FROM projects WHERE id = ? AND fk_owner_id = ?)
                OR EXISTS (SELECT 1 FROM project_members WHERE fk_project_id = ? AND fk_member_id = ?)
            )
        """.trimIndent()

        return jdbcTemplate.update(
            sql,
            assignTo.teamId?.let { Uuid.parse(it).toJavaUuid() },
            assignTo.teamMemberId?.let { Uuid.parse(it).toJavaUuid() },
            now,
            taskUuid,
            projectUuid,
            version,
            projectUuid,
            userUuid,
            projectUuid,
            userUuid
        ) > 0
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTask(projectId: String, userId: String, taskId: String, version: Long): Int {
        val taskUuid = Uuid.parse(taskId).toJavaUuid()
        val projectUuid = Uuid.parse(projectId).toJavaUuid()
        val userUuid = Uuid.parse(userId).toJavaUuid()

        val sql = """
            DELETE FROM project_tasks 
            WHERE id = ? AND fk_project_id = ? AND version = ?
            AND (
                EXISTS (SELECT 1 FROM projects WHERE id = ? AND fk_owner_id = ?)
                OR fk_created_by = ?
            )
        """.trimIndent()

        return jdbcTemplate.update(
            sql, 
            taskUuid, 
            projectUuid,
            version,
            projectUuid,
            userUuid,
            userUuid
        )
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findTasks(
        projectId: String,
        assignedTeam: String?,
        isUnassigned: Boolean,
        limit: Int,
        offset: Int
    ): List<ProjectTask> {
        val projectUuid = Uuid.parse(projectId).toJavaUuid()
        val teamUuid = assignedTeam?.let { Uuid.parse(it).toJavaUuid() }
        
        var sql = "SELECT * FROM project_tasks WHERE fk_project_id = ? "
        val params = mutableListOf<Any?>(projectUuid)
        
        if (isUnassigned) {
            sql += " AND fk_assigned_team IS NULL "
        } else if (teamUuid != null) {
            sql += " AND fk_assigned_team = ? "
            params.add(teamUuid)
        }
        
        sql += " ORDER BY lexo_rank ASC, id ASC LIMIT ? OFFSET ?"
        params.add(limit)
        params.add(offset)

        return jdbcTemplate.query(sql, { rs, _ ->
            ProjectTask(
                id = rs.getString("id"),
                projectId = rs.getString("fk_project_id"),
                parentTaskId = rs.getString("fk_parent_task_id"),
                rootId = rs.getString("fk_root_id"),
                path = rs.getString("path"),
                createdBy = rs.getString("fk_created_by"),
                title = rs.getString("title"),
                description = rs.getString("description"),
                assignedTeam = rs.getString("fk_assigned_team"),
                assignedTeamMember = rs.getString("fk_assigned_team_member"),
                status = rs.getString("status"),
                lexoRank = rs.getString("lexo_rank"),
                version = rs.getLong("version"),
                createdAt = rs.getTimestamp("created_at"),
                updatedAt = rs.getTimestamp("updated_at")
            )
        }, *params.toTypedArray())
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findTaskById(projectId: String, taskId: String): ProjectTask? {
        val sql = "SELECT * FROM project_tasks WHERE id = ?::uuid AND fk_project_id = ?::uuid"
        return jdbcTemplate.query(sql, { rs, _ ->
            ProjectTask(
                id = rs.getString("id"),
                projectId = rs.getString("fk_project_id"),
                parentTaskId = rs.getString("fk_parent_task_id"),
                rootId = rs.getString("fk_root_id"),
                path = rs.getString("path"),
                createdBy = rs.getString("fk_created_by"),
                title = rs.getString("title"),
                description = rs.getString("description"),
                assignedTeam = rs.getString("fk_assigned_team"),
                assignedTeamMember = rs.getString("fk_assigned_team_member"),
                status = rs.getString("status"),
                lexoRank = rs.getString("lexo_rank"),
                version = rs.getLong("version"),
                createdAt = rs.getTimestamp("created_at"),
                updatedAt = rs.getTimestamp("updated_at")
            )
        }, Uuid.parse(taskId).toJavaUuid(), Uuid.parse(projectId).toJavaUuid()).firstOrNull()
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteTasksByProjectBatch(projectId: String, limit: Int): Int {
        val projectUuid = Uuid.parse(projectId).toJavaUuid()
        
        /**
         * CHUNKY DELETE: Using a CTE with LIMIT to perform a fast, non-blocking delete.
         * This targets the primary key (id) for maximum efficiency.
         */
        val sql = """
            DELETE FROM project_tasks 
            WHERE id IN (
                SELECT id FROM project_tasks 
                WHERE fk_project_id = ?::uuid 
                LIMIT ?
            )
        """.trimIndent()

        return jdbcTemplate.update(sql, projectUuid, limit)
    }
}
