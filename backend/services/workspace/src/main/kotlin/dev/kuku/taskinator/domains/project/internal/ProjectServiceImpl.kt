package dev.kuku.taskinator.domains.project.internal

import com.github.f4b6a3.uuid.UuidCreator
import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val log = KotlinLogging.logger {}

/**
 * PROJECT DOMAIN SERVICE: Business Logic & Guardrails
 */
@Service
@Transactional
class ProjectServiceImpl(
    private val projectRepo: ProjectQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) : ProjectService {

    private val TOPIC = "workspace-activity"
    private val MAX_LIMIT = 100

    override fun createProject(
        userId: String,
        projectName: String,
        projectDescription: String?,
        projectId: String?
    ): ProjectInfo? {
        log.info { "Creating Project $projectName for user $userId" }
        try {
            val finalId = projectId ?: UuidCreator.getTimeOrderedWithRandom().toString()
            return projectRepo.insertProject(
                finalId,
                projectName,
                userId,
                projectDescription,
                UUID.randomUUID().toString()
            )
        } catch (e: ProjectNameConflictException) {
            log.warn { "Creation failed: duplicate name" }
            throw e
        }
    }

    override fun renameProject(userId: String, projectId: String, toUpdate: ProjectFieldsToUpdate) {
        log.info { "Renaming project $projectId" }
        try {
            projectRepo.updateProject(projectId, userId, toUpdate)
            
            // Fire event for sync with other services
            kafkaTemplate.send(TOPIC, projectId, ProjectEvent.ProjectRenamed(
                projectId = projectId,
                userId = userId,
                name = toUpdate.name,
                description = toUpdate.description,
                version = toUpdate.version
            ))
        } catch (e: Exception) {
            when (e) {
                is ProjectConcurrencyException,
                is ProjectNameConflictException -> throw e
                else -> throw e
            }
        }
    }

    override fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            projectRepo.insertProjectMembers(projectId, userId, memberIds)
            
            kafkaTemplate.send(TOPIC, projectId, ProjectEvent.ProjectMembersAdded(
                projectId = projectId,
                userId = userId,
                memberIds = memberIds
            ))
        } catch (e: Exception) {
            log.error(e) { "Failed to add project members" }
            throw e
        }
    }

    override fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            projectRepo.deleteProjectMembers(projectId, userId, memberIds)
            
            kafkaTemplate.send(TOPIC, projectId, ProjectEvent.ProjectMembersRemoved(
                projectId = projectId,
                userId = userId,
                memberIds = memberIds
            ))
        } catch (e: Exception) {
            log.error(e) { "Failed to remove project members" }
            throw e
        }
    }

    override fun deleteProject(projectId: String, userId: String, version: Long): Boolean {
        // We do NOT perform a hard delete of the project metadata here.
        // Instead, we verify ownership/version and trigger the ASYNC cleanup.
        // In a real high-scale system, you might mark it as status = 'DELETED' first.
        
        // For now, we perform the metadata delete and member delete synchronously 
        // as they are small tables, but fire the event for the HEAVY data (Teams/Tasks).
        val deletedRows = projectRepo.deleteProject(projectId, userId, version)

        if (deletedRows == 0) {
            throw ProjectConcurrencyException("Delete failed: version mismatch or unauthorized.")
        }

        // HEAVY CASCADE: Trigger async cleanup of Teams and Tasks
        kafkaTemplate.send(TOPIC, projectId, ProjectEvent.ProjectDeleted(
            projectId = projectId,
            userId = userId,
            version = version
        ))

        log.info { "ProjectService: Initiated cascading cleanup for project $projectId" }
        return true
    }

    override fun getProjectById(projectId: String, userId: String): ProjectInfo? {
        return projectRepo.findProjectById(projectId, userId)
    }

    override fun getProjectsByUser(userId: String, limit: Int, offset: Int): List<ProjectInfo> {
        val enforcedLimit = limit.coerceAtMost(MAX_LIMIT)
        return projectRepo.findProjectsByOwner(userId, enforcedLimit, offset)
    }

    override fun getProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember> {
        val enforcedLimit = limit.coerceAtMost(MAX_LIMIT)
        return projectRepo.findProjectMembers(projectId, userId, sortBy, offset, enforcedLimit)
    }

    override fun getProjectUserIsPartOf(userId: String, limit: Int, offset: Int): List<String> {
        val enforcedLimit = limit.coerceAtMost(MAX_LIMIT)
        return projectRepo.findProjectIdsByUserMembership(userId, enforcedLimit, offset)
    }
}
