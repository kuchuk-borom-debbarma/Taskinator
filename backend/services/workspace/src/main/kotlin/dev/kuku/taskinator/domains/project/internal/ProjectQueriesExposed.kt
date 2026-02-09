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
     * Inserts a new project into the database.
     * 
     * Uses [insertAndGetId] from org.jetbrains.exposed.v1.jdbc to perform the insert
     * and retrieve the generated [EntityID] of the time-ordered UUID.
     * 
     * After insertion, it fetches the full record to ensure we return the database-generated
     * values like [createdAt] and the initial [version].
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun insertProject(
        name: String,
        ownerId: String,
        description: String?
    ): ProjectInfo? {
        log.debug { "Insert project $name for owner $ownerId" }

        val generatedId = Projects.insertAndGetId {
            it[Projects.projectName] = name
            it[Projects.ownerId] = Uuid.parse(ownerId)
            it[Projects.description] = description ?: ""
        }

        return Projects.selectAll()
            .where { Projects.id eq generatedId }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

    /**
     * Updates an existing project using Optimistic Locking.
     * 
     * The [where] clause includes [Projects.version] to ensure the record hasn't been
     * modified by another process since it was last read.
     * 
     * If [updatedRows] is 0, it indicates a concurrency conflict or that the project
     * does not exist for the given user.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun updateProject(
        projectId: String,
        userId: String,
        toUpdate: ProjectFieldsToUpdate
    ) {
        log.debug { "Updating project $projectId for user $userId" }

        val updatedRows = Projects.update({
            (Projects.id eq Uuid.parse(projectId)) and
                    (Projects.ownerId eq Uuid.parse(userId)) and
                    (Projects.version eq toUpdate.version) // The "Compare" part of Compare-and-Swap
        }) {
            if (toUpdate.name != null) it[Projects.projectName] = toUpdate.name
            if (toUpdate.description != null) it[Projects.description] = toUpdate.description

            it[Projects.version] = toUpdate.version + 1 // The "Swap" part (incrementing version)
            it[Projects.updatedAt] = LocalDateTime.now(ZoneOffset.UTC) // Standardized to UTC
        }

        if (updatedRows == 0) {
            throw IllegalStateException("Update failed: Project modified by another user or does not exist.")
        }
    }

    /**
     * Batch inserts multiple members into a project.
     * 
     * Uses [batchInsert] for high performance (10k RPS target).
     * [ignore] = true handles idempotency (ON CONFLICT DO NOTHING).
     * [ownerId] is included for sharding compatibility.
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

            this[ProjectMembers.username] = "member_$memberId"
            this[ProjectMembers.displayName] = "Member $memberId"
            this[ProjectMembers.createdAt] = now
        }
    }

    /**
     * Dynamic member search with pagination and sorting.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectIdsByUserMembership(userId: String, limit: Int, offset: Int): List<String> {
        log.debug { "Finding project IDs where user $userId is a member (limit: $limit, offset: $offset)" }
        
        return ProjectMembers.selectAll()
            .where { ProjectMembers.memberId eq Uuid.parse(userId) }
            .orderBy(ProjectMembers.createdAt, SortOrder.DESC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it[ProjectMembers.projectId].toString() }
    }

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
                (ProjectMembers.projectId eq Uuid.parse(projectId)) and (ProjectMembers.ownerId eq Uuid.parse(
                    userId
                ))
            }
            .orderBy(sortColumn, SortOrder.ASC)
            .limit(limit)
            .offset(offset.toLong())
            .map { it.toProjectMember() }
    }

    /**
     * Batch deletes multiple members from a project using an IN list.
     * Efficient for single-statement bulk deletion at high scale.
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
     * Deletes a project using Optimistic Locking.
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

    /**
     * Finds a project by ID and User ID.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectById(projectId: String, userId: String): ProjectInfo? {
        log.debug { "Finding project $projectId for user $userId" }

        return Projects.selectAll()
            .where { (Projects.id eq Uuid.parse(projectId)) and (Projects.ownerId eq Uuid.parse(userId)) }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

    /**
     * Maps an Exposed [ResultRow] to our domain [ProjectMember] model.
     */
    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectsByOwner(userId: String, limit: Int, offset: Int): List<ProjectInfo> {
        log.debug { "Finding projects for user $userId with limit $limit and offset $offset" }

        return Projects.selectAll()
            .where { Projects.ownerId eq Uuid.parse(userId) }
            .orderBy(Projects.createdAt, SortOrder.DESC)
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
     * Maps an Exposed [ResultRow] to our domain [ProjectInfo] model.
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
