package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.web.bind.annotation.RequestHeader

@DgsComponent
class TeamMutationFetcher(private val teamService: TeamService) {

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.CreateTeam)
    fun createTeam(
        @InputArgument("input") input: CreateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTeamResponse {
        val result = teamService.createTeam(input.projectId, userId, input.name, input.parentTeamId)
        return if (result != null) {
            CreateTeamResponse(
                success = true,
                message = "Team created",
                response = Team(
                    id = result.id,
                    name = result.name,
                    projectId = result.projectId,
                    parentTeamId = result.parentTeamId,
                    createdAt = result.createdAt.toString(),
                    members = emptyList(),
                    tasks = emptyList()
                )
            )
        } else {
            CreateTeamResponse(success = false, message = "Failed to create team")
        }
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.UpdateTeam)
    fun updateTeam(
        @InputArgument("input") input: UpdateTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.updateTeam(input.projectId, userId, input.teamId, dev.kuku.taskinator.domains.team.UpdateTeamFields(
            teamName = input.name,
            parentTeamId = input.parentTeamId,
            version = input.version.toLong()
        ))
        return GenericResponse(success = true, message = "Team updated")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.DeleteTeam)
    fun deleteTeam(
        @InputArgument("input") input: DeleteTeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val success = teamService.deleteTeam(input.projectId, userId, input.teamId, input.version.toLong())
        return if (success) {
            GenericResponse(success = true, message = "Team deleted")
        } else {
            GenericResponse(success = false, message = "Team not found or unauthorized")
        }
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.AddTeamMembers)
    fun addTeamMembers(
        @InputArgument("input") input: AddTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.addTeamMembers(input.projectId, userId, input.teamId, input.memberIds)
        return GenericResponse(success = true, message = "Members added")
    }

    @DgsData(parentType = DgsConstants.TEAMMUTATION.TYPE_NAME, field = DgsConstants.TEAMMUTATION.RemoveTeamMembers)
    fun removeTeamMembers(
        @InputArgument("input") input: RemoveTeamMembersInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        teamService.removeTeamMembers(input.projectId, userId, input.teamId, input.memberIds)
        return GenericResponse(success = true, message = "Members removed")
    }
}
