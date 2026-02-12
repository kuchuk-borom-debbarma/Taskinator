package dev.kuku.taskinator.domains.project

import org.springframework.stereotype.Service

data class ProjectFieldsToUpdate(
    val version: Long,
    val name: String? = null,
    val description: String? = null
)

@Service
/**
 * Handles project related operation. Users can create projects. Projects can have teams and tasks.
 * Tasks can be assigned to teams. Tasks can have sub-tasks and so on.
 */
interface ProjectService {
    ///Create a project for the given user. Unique project name
    fun createProject(userId: String, projectName: String, projectDescription: String): ProjectInfo?

    ///Rename a project. Unique project name
    fun renameProject(userId: String, projectId: String, toUpdate: ProjectFieldsToUpdate)

    ///Add member to the project
    fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    ///Remove project members
    fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    ///Delete a project of a user
    fun deleteProject(projectId: String, userId: String, version: Long): Boolean

    ///Get the project by Id
    fun getProjectById(projectId: String, userId: String): ProjectInfo?

    ///Get projects that the user created
    fun getProjectsByUser(userId: String, limit: Int, offset: Int): List<ProjectInfo>

    ///Get project members as pagination
    fun getProjectMembers(
        projectId: String,
        userId: String,
        sortBy: ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<ProjectMember>

    ///Get projectIds that the user is part of
    fun getProjectUserIsPartOf(userId: String, limit: Int, offset: Int): List<String>
}
