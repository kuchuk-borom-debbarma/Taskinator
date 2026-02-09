package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.ProjectFieldsToUpdate
import dev.kuku.taskinator.domains.project.ProjectInfo

interface ProjectQueries {
    fun insertProject(name: String, ownerId: String, description: String?): ProjectInfo?

    fun updateProject(
        projectId: String, userId: String, toUpdate:
        ProjectFieldsToUpdate
    )

    fun insertProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    fun deleteProjectMembers(projectId: String, userId: String, memberIds: List<String>)

    fun deleteProject(projectId: String, userId: String, version: Long): Int

    fun findProjectById(projectId: String, userId: String): ProjectInfo?

    fun findProjectsByOwner(userId: String, limit: Int, offset: Int): List<ProjectInfo>

    fun findProjectMembers(
        projectId: String,
        userId: String,
        sortBy: dev.kuku.taskinator.domains.project.ProjectMemberSortKey,
        offset: Int,
        limit: Int
    ): List<dev.kuku.taskinator.domains.project.ProjectMember>
}