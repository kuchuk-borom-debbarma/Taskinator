package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.team.TeamEvent
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader
import java.time.Instant

/**
 * TeamMutationFetcher implements the "Ingest" phase for Team mutations.
 * 
 * By using the Unified Entity Stream, it ensures that all team operations 
 * are processed in the correct order relative to projects and tasks.
 */
@DgsComponent
class TeamMutationFetcher(
    private val kafkaTemplate: KafkaTemplate<String, Any>,
    private val teamService: TeamService
) {

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME)
    fun createTeam(
        @InputArgument("input") input: CreateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTeamResponse {
        
        /**
         * 1. ID-FIRST GENERATION
         * Ensures the team has a permanent identity before hitting the DB.
         */
        val teamId = UuidCreator.getTimeOrderedWithRandom().toString()
        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()

        // 2. CREATE TEAM SYNCHRONOUSLY
        val createdTeam = teamService.createTeam(
            projectId = input.projectId,
            userId = userId,
            teamName = input.name,
            parentTeamId = input.parentTeamId,
            teamId = teamId
        ) ?: throw RuntimeException("Failed to create team!")

        // 3. CONSTRUCT TEAM EVENT for background tasks (hierarchy computation)
        val event = TeamEvent.TeamCreated(
            projectId = input.projectId,
            userId = userId,
            teamId = teamId,
            name = input.name,
            parentTeamId = input.parentTeamId,
            idempotencyKey = idempotencyKey
        )

        // 4. PRODUCE TO UNIFIED STREAM (Partitioned by Project)
        kafkaTemplate.send("workspace-activity", input.projectId, event)

        // 5. RETURN CREATED
        return CreateTeamResponse(
            success = true,
            message = "Team created successfully",
            response = Team(
                id = teamId,
                name = input.name,
                projectId = input.projectId,
                parentTeamId = input.parentTeamId,
                createdAt = createdTeam.createdAt.toString(),
                members = emptyList(),
                tasks = emptyList()
            )
        )
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME)
    fun updateTeam(
        @InputArgument("input") input: UpdateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.updateTeam(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            toUpdate = dev.kuku.taskinator.domains.team.UpdateTeamFields(
                version = input.version.toLong(),
                teamName = input.name,
                parentTeamId = input.parentTeamId
            )
        )

        val event = TeamEvent.TeamRenamed(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            name = input.name ?: "",
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Team updated successfully")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME)
    fun deleteTeam(
        @InputArgument("input") input: DeleteTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val descendantIds = teamService.deleteTeam(input.projectId, userId, input.teamId, input.version.toLong())

        val event = TeamEvent.TeamDeleted(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            descendantTeamIds = descendantIds,
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Team deleted successfully")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME)
    fun addTeamMembers(
        @InputArgument("input") input: AddTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.addTeamMembers(input.projectId, userId, input.teamId, input.memberIds)

        val event = TeamEvent.TeamMembersAdded(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            memberIds = input.memberIds
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Members added successfully")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME)
    fun removeTeamMembers(
        @InputArgument("input") input: RemoveTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.removeTeamMembers(input.projectId, userId, input.teamId, input.memberIds)

        val event = TeamEvent.TeamMembersRemoved(
            projectId = input.projectId,
            userId = userId,
            teamId = input.teamId,
            memberIds = input.memberIds
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Members removed successfully")
    }
}
