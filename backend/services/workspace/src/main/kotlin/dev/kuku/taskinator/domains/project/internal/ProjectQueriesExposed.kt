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
        log.debug { "Batch inserting ${memberIds.size} members for project $projectId" }

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

    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectIdsByUserMembership(userId: String, limit: Int, offset: Int): List<String> {
        return ProjectMembers.selectAll()
            .where { ProjectMembers.memberId eq Uuid.parse(userId) }
            .orderBy(ProjectMembers.createdAt to SortOrder.DESC, ProjectMembers.id to SortOrder.ASC)
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

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        ProjectMembers.deleteWhere {
            (ProjectMembers.projectId eq Uuid.parse(projectId)) and
                    (ProjectMembers.ownerId eq Uuid.parse(userId)) and
                    (ProjectMembers.memberId inList memberIds.map { Uuid.parse(it) })
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun deleteProject(projectId: String, userId: String, version: Long): Int {
        return Projects.deleteWhere {
            (Projects.id eq Uuid.parse(projectId)) and
                    (Projects.ownerId eq Uuid.parse(userId)) and
                    (Projects.version eq version)
        }
    }

    @OptIn(ExperimentalUuidApi::class)
    override fun findProjectById(projectId: String, userId: String): ProjectInfo? {
        return Projects.selectAll()
            .where { (Projects.id eq Uuid.parse(projectId)) and (Projects.ownerId eq Uuid.parse(userId)) }
            .map { it.toProjectInfo() }
            .singleOrNull()
    }

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
