package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.*
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlin.uuid.toJavaUuid

private val log = KotlinLogging.logger {}

@Repository
class ProjectQueriesExposed(private val jdbcTemplate: JdbcTemplate) : ProjectQueries {

    /**
     * ATOMIC INSERT WITH RETURNING (1 DB Call):
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertProject(
        name: String,
        ownerId: String,
        description: String?
    ): ProjectInfo? {
        log.debug { "Insert project $name for owner $ownerId" }

        val ownerUuid = Uuid.parse(ownerId)
        val now = LocalDateTime.now(ZoneOffset.UTC)
        
        val resultRow = try {
            Projects.insert {
                it[Projects.projectName] = name
                it[Projects.ownerId] = ownerUuid
                it[Projects.description] = description ?: ""
                it[Projects.createdAt] = now
                it[Projects.version] = 0
            }.resultedValues?.singleOrNull()
        } catch (e: Exception) {
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw ProjectNameConflictException("Project with name '$name' already exists for this user.")
            }
            throw e
        }

        return resultRow?.toProjectInfo()
    }

    /**
     * OPTIMISTIC PROJECT UPDATE:
     * Updates name or description while validating the owner and current version.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun updateProject(
        projectId: String,
        userId: String,
        toUpdate: ProjectFieldsToUpdate
    ) {
        log.debug { "Updating project $projectId for user $userId" }

        try {
            val updatedRows = Projects.update({
                (Projects.id eq Uuid.parse(projectId)) and
                        (Projects.ownerId eq Uuid.parse(userId)) and
                        (Projects.version eq toUpdate.version)
            }) {
                if (toUpdate.name != null) it[Projects.projectName] = toUpdate.name
                if (toUpdate.description != null) it[Projects.description] = toUpdate.description

                it[Projects.version] = toUpdate.version + 1
                it[Projects.updatedAt] = LocalDateTime.now(ZoneOffset.UTC)
            }

            if (updatedRows == 0) {
                throw ProjectConcurrencyException("Update failed: Concurrency conflict.")
            }
        } catch (e: Exception) {
            if (e is ProjectConcurrencyException) throw e
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw ProjectNameConflictException("Project name conflict.")
            }
            throw e
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun insertProjectMembers(
        projectId: String,
        userId: String,
        memberIds: List<String>
    ) {
        val projectUuid = Uuid.parse(projectId)
        val ownerUuid = Uuid.parse(userId)
        val memberUuids = memberIds.map { Uuid.parse(it).toJavaUuid() }.toTypedArray()
        val now = LocalDateTime.now(ZoneOffset.UTC)

        /**
         * ATOMIC SECURE BATCH INSERT (1 DB Call):
         * Performs both Ownership Validation and Insertion in a single round-trip.
         * 
         * Logic: We only insert into 'project_members' if the project ID exists AND 
         * its owner matches the 'userId' provided. This prevents non-owners from 
         * injecting members into projects they don't control.
         * 
         * Performance: O(1) app-side complexity regardless of batch size.
         * 
         * Visualizing the CROSS JOIN (The "Sticker" Analogy):
         * 1. 'unnest(?)' creates a vertical column of Member IDs (Virtual Table 'm').
         * 2. 'projects' filters down to 1 specific Project Row (Table 'p').
         * 3. 'CROSS JOIN' stretches the 1 Project Row to fit every Member ID.
         *
         * Table 'p' (Project)       Table 'm' (Input IDs)      Result (Ready to Insert)
         * | ID   | OWNER |    X    | ID |                 =>  | PROJ_1 | OWNER_99 | ID_A |
         * | PROJ_1| OWNER_99|       | ID_A |               =>  | PROJ_1 | OWNER_99 | ID_B |
         *                           | ID_B |               =>  | PROJ_1 | OWNER_99 | ID_C |
         *                           | ID_C |
         *
         * Why CROSS JOIN?
         * We use CROSS JOIN because Table 'm' is a "virtual" table generated from raw input. 
         * There is no common column to join 'ON' (like p.id = m.project_id) because the 
         * relationship doesn't exist yet! CROSS JOIN allows us to multiply our 1 validated 
         * project row by all input IDs to create the new relationship records.
         */
        val sql = """
            INSERT INTO project_members (id, fk_project_id, fk_owner_id, fk_member_id, username, display_name, created_at)
            SELECT gen_random_uuid(), p.id, p.fk_owner_id, m.id, 'member_' || m.id, 'Member ' || m.id, ?
            FROM projects p
            CROSS JOIN (SELECT unnest(?) as id) m
            WHERE p.id = ? AND p.fk_owner_id = ?
            ON CONFLICT (fk_project_id, fk_member_id) DO NOTHING
        """.trimIndent()

        val rows = jdbcTemplate.update(sql) { ps ->
            ps.setTimestamp(1, java.sql.Timestamp.valueOf(now))
            ps.setArray(2, ps.connection.createArrayOf("uuid", memberUuids))
            ps.setObject(3, projectUuid.toJavaUuid())
            ps.setObject(4, ownerUuid.toJavaUuid())
        }

        if (rows == 0 && memberIds.isNotEmpty()) {
            // Check if failure was due to ownership
            val exists = Projects.selectAll()
                .where { (Projects.id eq projectUuid) and (Projects.ownerId eq ownerUuid) }
                .any()
            if (!exists) {
                throw IllegalArgumentException("Project not found or unauthorized.")
            }
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProject(projectId: String, userId: String, version: Long): Int {
        val projectUuid = Uuid.parse(projectId)
        val ownerUuid = Uuid.parse(userId)

        /**
         * ATOMIC PROJECT DELETE (1-Call):
         * Deletes the project and its members in a single round-trip.
         * Other entities (Teams, Tasks) are still cleaned up asynchronously via events
         * to avoid an excessively large single transaction.
         */
        val sql = """
            WITH deleted_project AS (
                DELETE FROM projects 
                WHERE id = ? AND fk_owner_id = ? AND version = ?
                RETURNING id
            )
            DELETE FROM project_members 
            WHERE fk_project_id IN (SELECT id FROM deleted_project)
        """.trimIndent()

        // jdbcTemplate.update for CTE with multiple DELETEs might return total rows affected.
        // We need to ensure we return > 0 if the project itself was deleted.
        // Actually, we want to return the number of projects deleted (0 or 1).
        
        // Let's refine the SQL to return the count of deleted projects
        val refinedSql = """
            WITH deleted_project AS (
                DELETE FROM projects 
                WHERE id = ? AND fk_owner_id = ? AND version = ?
                RETURNING id
            ),
            deleted_members AS (
                DELETE FROM project_members 
                WHERE fk_project_id IN (SELECT id FROM deleted_project)
            )
            SELECT COUNT(*) FROM deleted_project
        """.trimIndent()

        return jdbcTemplate.queryForObject(
            refinedSql,
            Int::class.java,
            projectUuid.toJavaUuid(),
            ownerUuid.toJavaUuid(),
            version
        ) ?: 0
    }

    /**
     * MEMBERSHIP LOOKUP:
     * Finds all project IDs where the user is a member.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectIdsByUserMembership(userId: String, limit: Int, offset: Int): List<String> {
        return ProjectMembers.selectAll()
            .where { ProjectMembers.memberId eq Uuid.parse(userId) }
            .orderBy(ProjectMembers.createdAt to SortOrder.DESC, ProjectMembers.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it[ProjectMembers.projectId].toString() }
    }

    /**
     * PAGINATED MEMBER DISCOVERY:
     * Lists all members of a project with configurable sorting.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember> {
        val sortColumn = when (sortBy) {
            ProjectMemberSortKey.ADDED -> ProjectMembers.createdAt
            ProjectMemberSortKey.NAME -> ProjectMembers.displayName
        }

        return ProjectMembers.selectAll()
            .where {
                (ProjectMembers.projectId eq Uuid.parse(projectId)) and (ProjectMembers.ownerId eq Uuid.parse(userId))
            }
            .orderBy(sortColumn to SortOrder.ASC, ProjectMembers.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it.toProjectMember() }
    }

    /**
     * BATCH MEMBER REMOVAL:
     * Removes specified users from the project's member list.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        ProjectMembers.deleteWhere {
            (ProjectMembers.projectId eq Uuid.parse(projectId)) and
                    (ProjectMembers.ownerId eq Uuid.parse(userId)) and
                    (ProjectMembers.memberId inList memberIds.map { Uuid.parse(it) })
        }
    }

    /**
     * SINGLE PROJECT LOOKUP:
     * Fetches details of a project if the user is the owner.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectById(projectId: String, userId: String): ProjectInfo? {
        return Projects.selectAll()
            .where { (Projects.id eq Uuid.parse(projectId)) and (Projects.ownerId eq Uuid.parse(userId)) }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

    /**
     * PAGINATED OWNER DASHBOARD:
     * Lists all projects owned by the specified user.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectsByOwner(userId: String, limit: Int, offset: Int): List<ProjectInfo> {
        return Projects.selectAll()
            .where { Projects.ownerId eq Uuid.parse(userId) }
            .orderBy(Projects.createdAt to SortOrder.DESC, Projects.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it.toProjectInfo() }
    }

    @OptIn(ExperimentalUuidApi::class)
    private fun ResultRow.toProjectMember() = ProjectMember(
        projectId = this[ProjectMembers.projectId].toString(),
        memberId = this[ProjectMembers.memberId].toString(),
        createdAt = Date.from(this[ProjectMembers.createdAt].toInstant(ZoneOffset.UTC))
    )

    @OptIn(ExperimentalUuidApi::class)
    private fun ResultRow.toProjectInfo() = ProjectInfo(
        id = this[Projects.id].value.toString(),
        name = this[Projects.projectName],
        owner = this[Projects.ownerId].toString(),
        description = this[Projects.description],
        createdAt = Date.from(this[Projects.createdAt].toInstant(ZoneOffset.UTC)),
        updatedAt = this[Projects.updatedAt]?.let {
            Date.from(it.toInstant(ZoneOffset.UTC))
        } ?: Date()
    )
}
