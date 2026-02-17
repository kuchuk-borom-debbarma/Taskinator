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

    @DgsData(parentType = DgsConstants.TEAM.TYPE_NAME, field = DgsConstants.TEAM.Members)
    fun members(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.TEAM.MEMBERS_INPUT_ARGUMENT.Input) input: PaginationInput?
    ): List<TeamMember> {
        val team = dfe.getSource<Team>()!!
        return emptyList()
    }

    @DgsData(parentType = DgsConstants.TEAM.TYPE_NAME, field = DgsConstants.TEAM.Tasks)
    fun tasks(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.TEAM.TASKS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<Task> {
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
        ).map {
            Task(
                id = it.id,
                projectId = it.projectId,
                parentTaskId = it.parentTaskId,
                rootId = it.rootId,
                path = it.path,
                createdBy = it.createdBy,
                title = it.title,
                description = it.description,
                status = it.status,
                lexoRank = it.lexoRank,
                version = it.version.toInt(),
                createdAt = ""
            )
        }
    }
}
