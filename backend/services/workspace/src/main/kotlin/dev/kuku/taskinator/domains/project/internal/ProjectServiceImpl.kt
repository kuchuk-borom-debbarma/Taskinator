package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val log = KotlinLogging.logger {} // Automatically detects the class name

@Service
class ProjectServiceImpl(private val projectRepo: ProjectQueries) : ProjectService {
    ///Create a project for the given user. Unique project name
    override fun createProject(userId: String, projectName: String, projectDescription: String): ProjectInfo? {
        log.info { "Creating Project $projectName for user $userId with desc $projectDescription" }
        val created = projectRepo.insertProject(projectName, userId, projectDescription)
        log.info { "Created project ${created?.id}" }
        return created
    }

    ///Rename a project. Unique project name
    override fun renameProject(userId: String, projectId: String, toUpdate: ProjectFieldsToUpdate) {
        log.info { "Rename project with id $projectId with $toUpdate" }
        projectRepo.updateProject(projectId, userId, toUpdate)
        log.info { "Renamed project $projectId" }
    }

    ///Add member to the project
    override fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            log.info { "Adding members to project $projectId owned by user $userId members: $memberIds" }
            projectRepo.insertProjectMembers(projectId, userId, memberIds)
            TODO("Fire event about adding members. This will be picked up and members count will be updated")
        } catch (e: Exception) {
            log.error { "Error while adding members $e" }
        }

    }

    ///Remove project members
    override fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>) {
        try {
            log.info { "Removing members from project $projectId owned by user $userId members: $memberIds" }
            projectRepo.deleteProjectMembers(projectId, userId, memberIds)
            TODO("Fire event about removing members. This will be picked up and members count will be updated")
        } catch (e: Exception) {
            log.error { "Error while removing members $e" }
        }
    }

    ///Delete a project of a user
    override fun deleteProject(projectId: String, userId: String, version: Long): Boolean {
        log.info { "Deleting project $projectId owned by $userId with version $version" }
        val deletedRows = projectRepo.deleteProject(projectId, userId, version)
        
        if (deletedRows == 0) {
            log.warn { "Failed to delete project $projectId - version mismatch or not found" }
            return false
        }
        
        log.info { "Project $projectId deleted. Firing cleanup event." }
        TODO("Fire PROJECT_DELETED event for background cleanup of members, teams, and tasks")
        
        return true
    }

    ///Get the project by id
    override fun getProjectById(projectId: String, userId: String): ProjectInfo? {
        log.info { "Fetching project $projectId for user $userId" }
        return projectRepo.findProjectById(projectId, userId)
    }

    override fun getProjectsByUser(
        userId: String,
        limit: Int,
        offset: Int
    ): List<ProjectInfo> {
        log.info { "Fetching projects for user $userId (limit: $limit, offset: $offset)" }
        return projectRepo.findProjectsByOwner(userId, limit, offset)
    }

    ///Get project members as pagination
    override fun getProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember> {
        log.info { "Fetching members for project $projectId (Owner: $userId) with sort $sortBy, offset $offset, limit $limit" }
        return projectRepo.findProjectMembers(projectId, userId, sortBy, offset, limit)
    }

    override fun getProjectUserIsPartOf(
        userId: String,
        limit: Int,
        offset: Int
    ): List<String> {
        log.info { "Fetching project IDs user $userId is a member of (limit: $limit, offset: $offset)" }
        return projectRepo.findProjectIdsByUserMembership(userId, limit, offset)
    }
}
