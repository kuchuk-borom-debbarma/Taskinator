package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.PaginationInput
import dev.kuku.taskinator.generated.types.Team
import dev.kuku.taskinator.generated.types.TeamMember
import dev.kuku.taskinator.generated.types.Task

import org.springframework.web.bind.annotation.RequestHeader

/**
 * Resolves fields of team type
 */
@DgsComponent
class TeamDataFetcher(
    private val teamService: dev.kuku.taskinator.domains.team.TeamService,
    private val taskService: TaskService
) {

    @DgsData(parentType = DgsConstants.TEAM.TYPE_NAME)
    fun members(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.TEAM.MEMBERS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<TeamMember> {
        val team = dfe.getSource<Team>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0
        
        return teamService.getTeamMembers(team.projectId, userId, team.id, limit, offset).map {
            TeamMember(
                user = dev.kuku.taskinator.generated.types.User(id = it.memberId, projects = emptyList()),
                createdAt = it.createdAt.toString()
            )
        }
    }

    @DgsData(parentType = DgsConstants.TEAM.TYPE_NAME)
    fun tasks(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.TEAM.TASKS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<dev.kuku.taskinator.domains.task.ProjectTask> {
        val team = dfe.getSource<Team>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0

        return taskService.getTasks(
            team.projectId,
            userId,
            dev.kuku.taskinator.domains.task.GetTasksFilterParam(
                assignedTeam = team.id,
                limit = limit,
                offset = offset
            )
        )
    }
}
