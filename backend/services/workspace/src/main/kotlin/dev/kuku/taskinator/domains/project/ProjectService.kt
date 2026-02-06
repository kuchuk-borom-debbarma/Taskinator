package dev.kuku.taskinator.domains.project

import org.springframework.stereotype.Service

@Service
/**
 * Handles project related operation. Users can create projects
 */
interface ProjectService {
    ///Create a project for the given user. Unique project name
    fun createProject(userId: String, projectName: String)

    ///Rename a project. Unique project name
    fun renameProject(userId: String, projectId: String, updatedName: String)

    ///Add member to the project
    fun addProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    ///Remove project members
    fun removeProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    ///Delete a project of a user
    fun deleteProject(projectId: String, userId: String)
}