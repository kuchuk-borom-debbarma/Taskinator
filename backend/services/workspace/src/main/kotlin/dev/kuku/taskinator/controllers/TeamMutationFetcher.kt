package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.team.TeamEvent
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader
import java.time.Instant

/**
 * TeamMutationFetcher implements the "Ingest" phase for Team mutations.
 * It uses the Unified Entity Stream (Kafka) to ensure causal ordering.
 */
@DgsComponent
class TeamMutationFetcher(
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.CreateTeam)
    fun createTeam(
        @InputArgument("input") input: CreateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTeamResponse {
        
        // 1. GENERATE TEAM ID (ID-First)
        val teamId = UuidCreator.getTimeOrderedWithRandom().toString()
        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()

        // 2. CONSTRUCT EVENT
        val event = TeamEvent.TeamCreated(
            projectId = input.projectId,
            userId = userId,
            teamId = teamId,
            name = input.name,
            parentTeamId = input.parentTeamId,
            idempotencyKey = idempotencyKey
        )

        // 3. PRODUCE TO KAFKA
        kafkaTemplate.send("workspace-activity", input.projectId, event)

        // 4. RETURN ACCEPTED
        return CreateTeamResponse(
            success = true,
            message = "Team creation queued",
            response = Team(
                id = teamId,
                name = input.name,
                projectId = input.projectId,
                parentTeamId = input.parentTeamId,
                createdAt = Instant.now().toString(),
                members = emptyList(),
                tasks = emptyList()
            )
        )
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.UpdateTeam)
    fun updateTeam(
        @InputArgument("input") input: UpdateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TeamEvent.TeamRenamed(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            name = input.name ?: "",
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Team update queued")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.DeleteTeam)
    fun deleteTeam(
        @InputArgument("input") input: DeleteTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TeamEvent.TeamDeleted(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Team deletion queued")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.AddTeamMembers)
    fun addTeamMembers(
        @InputArgument("input") input: AddTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TeamEvent.TeamMembersAdded(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            memberIds = input.memberIds
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Member addition queued")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.RemoveTeamMembers)
    fun removeTeamMembers(
        @InputArgument("input") input: RemoveTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TeamEvent.TeamMembersRemoved(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            memberIds = input.memberIds
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Member removal queued")
    }
}
