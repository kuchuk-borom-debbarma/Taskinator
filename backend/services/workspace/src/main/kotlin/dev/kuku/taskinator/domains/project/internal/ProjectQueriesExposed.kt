package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
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
class ProjectQueriesExposed : ProjectQueries {

    /**
     * Inserts a new project into the 'projects' table.
     * 
     * CONCURRENCY & INTEGRITY:
     * - Uses [insertAndGetId] to create the project and return its UUID.
     * - Enforces name uniqueness per owner via a DB unique index.
     * - Throws [ProjectNameConflictException] if a collision occurs.
     * 
     * NOTE: This method is designed to be called within a @Transactional context
     * provided by the Service layer to ensure atomic operations.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertProject(
        name: String,
        ownerId: String,
        description: String?
    ): ProjectInfo? {
        log.debug { "Insert project $name for owner $ownerId" }

        val ownerUuid = Uuid.parse(ownerId)
        
        val generatedId = try {
            Projects.insertAndGetId {
                it[Projects.projectName] = name
                it[Projects.ownerId] = ownerUuid
                it[Projects.description] = description ?: ""
            }
        } catch (e: Exception) {
            // Mapping low-level SQL exceptions to domain-specific exceptions for better API clarity
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw ProjectNameConflictException("Project with name '$name' already exists for this user.")
            }
            throw e
        }

        return Projects.selectAll()
            .where { Projects.id eq generatedId }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

    /**
     * Updates an existing project using Optimistic Locking (version-based).
     * 
     * ARCHITECTURE:
     * - The WHERE clause includes 'version' to ensure the record hasn't changed since last read.
     * - Throws [ProjectConcurrencyException] if 'updatedRows' is 0 (indicating a conflict).
     * - Throws [ProjectNameConflictException] if renaming to an existing project name.
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
                throw ProjectConcurrencyException("Update failed: Project modified by another user or does not exist.")
            }
        } catch (e: Exception) {
            if (e is ProjectConcurrencyException) throw e
            if (e.message?.contains("Unique", ignoreCase = true) == true || 
                e.message?.contains("duplicate", ignoreCase = true) == true) {
                throw ProjectNameConflictException("Project name '${toUpdate.name}' already exists for this user.")
            }
            throw e
        }
    }

    /**
     * Batch inserts multiple members into a project.
     * 
     * PERFORMANCE (10k RPS):
     * - Uses [batchInsert] to bundle multiple rows into a single JDBC packet.
     * - Setting 'reWriteBatchedInserts=true' in application.yaml collapses these into one SQL statement.
     * - 'shouldReturnGeneratedValues = false' prevents the driver from waiting for ID roundtrips.
     * - 'ignore = true' provides idempotency (silently skips members already in the project).
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertProjectMembers(
        projectId: String,
        userId: String,
        memberIds: List<String>
    ) {
        log.debug { "Batch inserting ${memberIds.size} members for project $projectId (Owner: $userId)" }

        val projectUuid = Uuid.parse(projectId)
        val ownerUuid = Uuid.parse(userId)
        val now = LocalDateTime.now(ZoneOffset.UTC)

        ProjectMembers.batchInsert(
            data = memberIds,
            ignore = true,
            shouldReturnGeneratedValues = false
        ) { memberId: String ->
            this[ProjectMembers.projectId] = projectUuid
            this[ProjectMembers.ownerId] = ownerUuid
            this[ProjectMembers.memberId] = Uuid.parse(memberId)

            // Member info is denormalized here for high-performance board rendering (No JOINs required later)
            this[ProjectMembers.username] = "member_$memberId"
            this[ProjectMembers.displayName] = "Member $memberId"
            this[ProjectMembers.createdAt] = now
        }
    }

    /**
     * Finds projects where the user is a member.
     * 
     * STABILITY:
     * - Always sorts by [id] as a tie-breaker after [createdAt] to ensure deterministic pagination.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectIdsByUserMembership(userId: String, limit: Int, offset: Int): List<String> {
        log.debug { "Finding project IDs where user $userId is a member (limit: $limit, offset: $offset)" }

        return ProjectMembers.selectAll()
            .where { ProjectMembers.memberId eq Uuid.parse(userId) }
            .orderBy(ProjectMembers.createdAt to SortOrder.DESC, ProjectMembers.id to SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it[ProjectMembers.projectId].toString() }
    }

    /**
     * Dynamic member search with pagination and sorting.
     * 
     * STABILITY:
     * - Tie-breaker: Always sorts by [id] at the end to prevent "item jumping" during concurrent writes.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember> {
        log.debug { "Finding members for project $projectId (Owner: $userId) sorted by $sortBy" }

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
     * Batch deletes multiple members from a project using a single SQL statement.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProjectMembers(
        projectId: String,
        userId: String,
        memberIds: List<String>
    ) {
        log.debug { "Batch deleting ${memberIds.size} members from project $projectId (Owner: $userId)" }

        val projectUuid = Uuid.parse(projectId)
        val ownerUuid = Uuid.parse(userId)
        val memberUuids = memberIds.map { Uuid.parse(it) }

        ProjectMembers.deleteWhere {
            (ProjectMembers.projectId eq projectUuid) and
                    (ProjectMembers.ownerId eq ownerUuid) and
                    (ProjectMembers.memberId inList memberUuids)
        }
    }

    /**
     * Synchronously deletes a project record using Optimistic Locking.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProject(projectId: String, userId: String, version: Long): Int {
        log.debug { "Deleting project $projectId for user $userId with version $version" }

        return Projects.deleteWhere {
            (Projects.id eq Uuid.parse(projectId)) and
                    (Projects.ownerId eq Uuid.parse(userId)) and
                    (Projects.version eq version)
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectById(projectId: String, userId: String): ProjectInfo? {
        log.debug { "Finding project $projectId for user $userId" }

        return Projects.selectAll()
            .where { (Projects.id eq Uuid.parse(projectId)) and (Projects.ownerId eq Uuid.parse(userId)) }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectsByOwner(userId: String, limit: Int, offset: Int): List<ProjectInfo> {
        log.debug { "Finding projects for user $userId with limit $limit and offset $offset" }

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

    /**
     * Maps ResultRow to ProjectInfo, converting LocalDateTime (UTC) to java.util.Date.
     */
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