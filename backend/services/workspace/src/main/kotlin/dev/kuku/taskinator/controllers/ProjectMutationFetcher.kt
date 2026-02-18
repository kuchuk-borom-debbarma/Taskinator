package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.web.bind.annotation.RequestHeader

@DgsComponent
class ProjectMutationFetcher(private val projectService: ProjectService) {

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.CreateProject)
    fun createProject(
        @InputArgument("input") input: CreateProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateProjectResponse {
        val result = projectService.createProject(userId, input.name, input.description ?: "")
        return if (result != null) {
            CreateProjectResponse(
                success = true,
                message = "Project created",
                response = Project(
                    id = result.id,
                    name = result.name,
                    owner = User(id = result.owner, projects = emptyList()),
                    description = result.description,
                    createdAt = result.createdAt.toString(),
                    updatedAt = result.updatedAt?.toString(),
                    teams = emptyList(),
                    members = emptyList(),
                    tasks = emptyList()
                )
            )
        } else {
            CreateProjectResponse(success = false, message = "Failed to create project")
        }
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.RenameProject)
    fun renameProject(
        @InputArgument("input") input: RenameProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.renameProject(userId, input.projectId, dev.kuku.taskinator.domains.project.ProjectFieldsToUpdate(
            name = input.name,
            description = input.description,
            version = input.version.toLong()
        ))
        return GenericResponse(success = true, message = "Project updated")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.DeleteProject)
    fun deleteProject(
        @InputArgument("input") input: DeleteProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val success = projectService.deleteProject(input.projectId, userId, input.version.toLong())
        return if (success) {
            GenericResponse(success = true, message = "Project deleted")
        } else {
            GenericResponse(success = false, message = "Project not found or unauthorized")
        }
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.AddProjectMembers)
    fun addProjectMembers(
        @InputArgument("input") input: AddProjectMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.addProjectMembers(input.projectId, userId, input.memberIds)
        return GenericResponse(success = true, message = "Members added")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.RemoveProjectMembers)
    fun removeProjectMembers(
        @InputArgument("input") input: RemoveProjectMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.removeProjectMembers(input.projectId, userId, input.memberIds)
        return GenericResponse(success = true, message = "Members removed")
    }
}
