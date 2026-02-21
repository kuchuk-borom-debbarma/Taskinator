package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader
import java.time.Instant

/**
 * ProjectMutationFetcher implements the "Ingest" phase for Project mutations.
 * It uses the Unified Entity Stream (Kafka) to ensure causal ordering.
 */
@DgsComponent
class ProjectMutationFetcher(
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.CreateProject)
    fun createProject(
        @InputArgument("input") input: CreateProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateProjectResponse {
        
        // 1. GENERATE PROJECT ID (ID-First)
        val projectId = UuidCreator.getTimeOrderedWithRandom().toString()
        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()

        // 2. CONSTRUCT EVENT
        val event = ProjectEvent.ProjectCreated(
            projectId = projectId,
            userId = userId,
            name = input.name,
            description = input.description ?: "",
            idempotencyKey = idempotencyKey
        )

        // 3. PRODUCE TO KAFKA
        // Partitioned by projectId (the ID we just generated)
        kafkaTemplate.send("workspace-activity", projectId, event)

        // 4. RETURN ACCEPTED
        return CreateProjectResponse(
            success = true,
            message = "Project creation queued",
            response = Project(
                id = projectId,
                name = input.name,
                owner = User(id = userId, projects = emptyList()),
                description = input.description,
                createdAt = Instant.now().toString(),
                teams = emptyList(),
                members = emptyList(),
                tasks = emptyList()
            )
        )
    }

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.RenameProject)
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

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.DeleteProject)
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

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.AddProjectMembers)
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

    @DgsData(parentType = DgsConstants.PROJECTMUTATION.TYPE_NAME, field = DgsConstants.PROJECTMUTATION.RemoveProjectMembers)
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
