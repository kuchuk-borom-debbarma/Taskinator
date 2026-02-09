package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val log = KotlinLogging.logger {}

@Service
class ProjectServiceImpl(private val projectRepo: ProjectQueries) : ProjectService {

    /**
     * DoS Protection Guard: Limits the maximum number of rows returned in a single request.
     * Prevents memory exhaustion (OOM) from malicious or buggy massive pagination parameters.
     */
    private val MAXLIMIT = 100

    override fun createProject(userId: String, projectName: String, projectDescription: String): ProjectInfo? {
        log.info { "Creating Project $projectName for user $userId" }
        try {
            val created = projectRepo.insertProject(projectName, userId, projectDescription)
            log.info { "Created project ${created?.id}" }
            return created
        } catch (e: ProjectNameConflictException) {
            log.warn { "Project creation failed: ${e.message}" }
            throw e
        }
    }

    override fun renameProject(userId: String, projectId: String, toUpdate: ProjectFieldsToUpdate) {
        log.info { "Rename project with id $projectId with $toUpdate" }
        try {
            projectRepo.updateProject(projectId, userId, toUpdate)
            log.info { "Renamed project $projectId" }
        } catch (e: Exception) {
            when (e) {
                is ProjectConcurrencyException,
                is ProjectNameConflictException -> {
                    log.warn { "Update rejected: ${e.message}" }
                    throw e
                }

                else -> throw e
            }
        }
    }

    /**
     * Security Bypass Guard:
     * Verifies project existence and ownership before adding members.
     * This prevents users from adding themselves to projects they don't own.
     */
    override fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            log.info { "Adding members to project $projectId owned by user $userId members: $memberIds" }

            // SECURITY: Verify the caller actually owns this project
            val project = projectRepo.findProjectById(projectId, userId)
                ?: throw IllegalArgumentException("Project not found or you don't have permission to add members.")
            projectRepo.insertProjectMembers(projectId, userId, memberIds)

            // EVENTUAL CONSISTENCY: Fire event to update counts/stats in background
            TODO("Fire PROJECT_MEMBERS_ADDED(projectId, userId, memberIds) event")
        } catch (e: Exception) {
            log.error(e) { "Error while adding members to project $projectId" }
            throw e
        }
    }

    override fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            log.info { "Removing members from project $projectId owned by user $userId members: $memberIds" }
            projectRepo.deleteProjectMembers(projectId, userId, memberIds)

            // Cleanup stats asynchronously
            TODO("Fire PROJECT_MEMBERS_REMOVED(projectId, userId, memberIds) event")
        } catch (e: Exception) {
            log.error(e) { "Error while removing members from project $projectId" }
            throw e
        }
    }

    override fun deleteProject(projectId: String, userId: String, version: Long): Boolean {
        log.info { "Deleting project $projectId owned by $userId with version $version" }
        val deletedRows = projectRepo.deleteProject(projectId, userId, version)

        if (deletedRows == 0) {
            log.warn { "Failed to delete project $projectId - version mismatch or not found" }
            throw ProjectConcurrencyException("Delete failed: Project modified by another user or does not exist.")
        }

        log.info { "Project $projectId deleted. Firing cleanup event." }

        // CASCADE DELETION: Fire event to clean up related data (members, teams, tasks)
        // This keeps the primary delete operation extremely fast.
        TODO("Fire PROJECT_DELETED(projectId, userId) event for background cleanup")

        return true
    }

    override fun getProjectById(projectId: String, userId: String): ProjectInfo? {
        log.info { "Fetching project $projectId for user $userId" }
        return projectRepo.findProjectById(projectId, userId)
    }

    override fun getProjectsByUser(userId: String, limit: Int, offset: Int): List<ProjectInfo> {
        val enforcedLimit = limit.coerceAtMost(MAXLIMIT)
        log.info { "Fetching projects for user $userId (limit: $enforcedLimit, offset: $offset)" }
        return projectRepo.findProjectsByOwner(userId, enforcedLimit, offset)
    }

    override fun getProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember> {
        val enforcedLimit = limit.coerceAtMost(MAXLIMIT)
        log.info { "Fetching members for project $projectId (Owner: $userId) with sort $sortBy, offset $offset, limit $enforcedLimit" }
        return projectRepo.findProjectMembers(projectId, userId, sortBy, offset, enforcedLimit)
    }

    override fun getProjectUserIsPartOf(userId: String, limit: Int, offset: Int): List<String> {
        val enforcedLimit = limit.coerceAtMost(MAXLIMIT)
        log.info { "Fetching project IDs user $userId is a member of (limit: $enforcedLimit, offset: $offset)" }
        return projectRepo.findProjectIdsByUserMembership(userId, enforcedLimit, offset)
    }
}