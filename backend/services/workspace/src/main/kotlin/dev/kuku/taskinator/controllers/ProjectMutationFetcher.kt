package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader

/**
 * ProjectMutationFetcher implements the "Ingest" phase for Project mutations.
 * 
 * It converts GraphQL requests into asynchronous events, allowing the API 
 * to scale to 1M RPS by removing synchronous database I/O from the request path.
 */
@DgsComponent
class ProjectMutationFetcher(
    private val kafkaTemplate: KafkaTemplate<String, Any>,
    private val projectService: ProjectService
) {

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun createProject(
        @InputArgument("input") input: CreateProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateProjectResponse {
        /**
         * 1. Create the project synchronously as projects are not created often
         * 2. Fire an event to kafka.
         */
        val createdProject = projectService.createProject(userId, input.name, input.description)
            ?: throw RuntimeException("Failed to create project!")

        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()
        val event = ProjectEvent.ProjectCreated(
            projectId = createdProject.id,
            userId = userId,
            name = input.name,
            description = input.description ?: "",
            idempotencyKey = idempotencyKey
        )
        kafkaTemplate.send("workspace-activity", createdProject.id, event)

        // 4. RETURN "ACCEPTED" (HTTP 202 Flow)
        return CreateProjectResponse(
            success = true,
            message = "Project created successfully",
            response = Project(
                id = createdProject.id,
                name = input.name,
                owner = User(id = userId, projects = emptyList()),
                description = input.description,
                createdAt = createdProject.createdAt.toString(),
                teams = emptyList(),
                members = emptyList(),
                tasks = emptyList()
            )
        )
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun renameProject(
        @InputArgument("input") input: RenameProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.renameProject(
            userId,
            input.projectId,
            dev.kuku.taskinator.domains.project.ProjectFieldsToUpdate(
                version = input.version.toLong(),
                name = input.name,
                description = input.description
            )
        )

        val event = ProjectEvent.ProjectRenamed(
            projectId = input.projectId,
            userId = userId,
            name = input.name,
            description = input.description,
            version = input.version.toLong()
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Project renamed successfully")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun deleteProject(
        @InputArgument("input") input: DeleteProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.deleteProject(input.projectId, userId, input.version.toLong())

        val event = ProjectEvent.ProjectDeleted(
            projectId = input.projectId,
            userId = userId,
            version = input.version.toLong()
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Project deleted successfully")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun addProjectMembers(
        @InputArgument("input") input: AddProjectMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = ProjectEvent.ProjectMembersAdded(
            projectId = input.projectId,
            userId = userId,
            memberIds = input.memberIds
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Member addition queued")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun removeProjectMembers(
        @InputArgument("input") input: RemoveProjectMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        projectService.removeProjectMembers(input.projectId, userId, input.memberIds)

        val event = ProjectEvent.ProjectMembersRemoved(
            projectId = input.projectId,
            userId = userId,
            memberIds = input.memberIds
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Members removed successfully")
    }
}
