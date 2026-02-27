package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import kotlinx.datetime.UtcOffset
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader
import java.time.Instant
import java.time.OffsetDateTime
import java.time.OffsetTime
import java.time.ZoneOffset

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
         * 3. [Yet to define consumers]
         */
        /**
         * 1. Create the project synchronously as projects are not created often
         * 2. Fire an event to kafka.
         * 3. [Yet to define consumers]
         */
        val createdProject = projectService.createProject(userId, input.name, input.description)
            ?: throw RuntimeException("Failed to create project!")

        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()
        val event = ProjectEvent.ProjectCreated(
            projectId = createdProject.id,
            timestamp = OffsetDateTime.now(ZoneOffset.UTC).toInstant(), //TODO util function
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
        val event = ProjectEvent.ProjectRenamed(
            projectId = input.projectId,
            userId = userId,
            name = input.name,
            description = input.description,
            version = input.version.toLong()
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Project rename queued")
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME)
    fun deleteProject(
        @InputArgument("input") input: DeleteProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = ProjectEvent.ProjectDeleted(
            projectId = input.projectId,
            userId = userId,
            version = input.version.toLong()
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Project deletion queued")
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
        val event = ProjectEvent.ProjectMembersRemoved(
            projectId = input.projectId,
            userId = userId,
            memberIds = input.memberIds
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Member removal queued")
    }
}
