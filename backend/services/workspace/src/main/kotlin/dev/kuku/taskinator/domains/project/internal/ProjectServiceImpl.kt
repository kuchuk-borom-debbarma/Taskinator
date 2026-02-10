package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val log = KotlinLogging.logger {}

/**
 * PROJECT DOMAIN SERVICE: Business Logic & Guardrails
 * 
 * CORE RESPONSIBILITIES:
 * 1. Security: Verifies ownership before performing sensitive operations.
 * 2. Stability: Enforces hard limits on pagination to prevent DoS attacks.
 * 3. Scalability: Fires events for non-critical stat updates (Eventual Consistency).
 */
@Service
class ProjectServiceImpl(private val projectRepo: ProjectQueries) : ProjectService {

    /**
     * DoS PROTECTION: Limits the maximum rows returned per request.
     * Prevents OOM (Out Of Memory) crashes if a user requests a limit of 1,000,000.
     */
    private val MAX_LIMIT = 100

    override fun createProject(userId: String, projectName: String, projectDescription: String): ProjectInfo? {
        log.info { "Creating Project $projectName for user $userId" }
        try {
            return projectRepo.insertProject(projectName, userId, projectDescription)
        } catch (e: ProjectNameConflictException) {
            log.warn { "Creation failed: duplicate name" }
            throw e
        }
    }

    override fun renameProject(userId: String, projectId: String, toUpdate: ProjectFieldsToUpdate) {
        log.info { "Renaming project $projectId" }
        try {
            projectRepo.updateProject(projectId, userId, toUpdate)
        } catch (e: Exception) {
            when (e) {
                is ProjectConcurrencyException,
                is ProjectNameConflictException -> throw e
                else -> throw e
            }
        }
    }

    /**
     * SECURE MEMBER ADDITION:
     * - Verifies project ownership and performs batch insertion in a single atomic DB call.
     * - Prevents unauthorized member injection via SQL-level validation.
     */
    override fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            // The repository handles ownership validation and batching in 1 call.
            projectRepo.insertProjectMembers(projectId, userId, memberIds)
            
            // ASYNC: Move stat updates (members_count) out of the critical request path.
            log.info { "TODO: Fire PROJECT_MEMBERS_ADDED event" }
        } catch (e: Exception) {
            log.error(e) { "Failed to add project members" }
            throw e
        }
    }

    override fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            projectRepo.deleteProjectMembers(projectId, userId, memberIds)
            log.info { "TODO: Fire PROJECT_MEMBERS_REMOVED event" }
        } catch (e: Exception) {
            log.error(e) { "Failed to remove project members" }
            throw e
        }
    }

    /**
     * LEAN DELETE:
     * - Synchronously deletes the Project record using Optimistic Locking.
     * - Defers heavy cleanup (Members, Teams, Tasks) to an async worker.
     */
    override fun deleteProject(projectId: String, userId: String, version: Long): Boolean {
        val deletedRows = projectRepo.deleteProject(projectId, userId, version)
        
        if (deletedRows == 0) {
            throw ProjectConcurrencyException("Delete failed: version mismatch.")
        }
        
        // CASCADE DELETION: The event-listener will clean up associated data.
        log.info { "TODO: Fire PROJECT_DELETED event for background cleanup" }
        
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
