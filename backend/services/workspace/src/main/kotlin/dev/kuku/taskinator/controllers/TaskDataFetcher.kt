package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.DgsEntityFetcher
import dev.kuku.taskinator.domains.task.ProjectTask
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.Team
import dev.kuku.taskinator.generated.types.User
import dev.kuku.taskinator.generated.types.Task
import org.springframework.web.bind.annotation.RequestHeader

@DgsComponent
class TaskDataFetcher(
    private val teamService: TeamService,
    private val taskService: TaskService
) {

    @DgsEntityFetcher(name = DgsConstants.TASK.TYPE_NAME)
    fun fetchTask(values: Map<String, Any>, @RequestHeader("X-User-Id") userId: String): ProjectTask? {
        val id = values["id"] as String
        // Note: projectId is unknown here
        return taskService.getTaskById("", userId, id)
    }

    @DgsData(parentType = DgsConstants.TASK.TYPE_NAME)
    fun assignedTeam(
        dfe: DgsDataFetchingEnvironment,
        @RequestHeader("X-User-Id") userId: String
    ): Team? {
        val task = dfe.getSource<ProjectTask>()!!
        val teamId = task.assignedTeam ?: return null
        
        // Note: In a heavily requested endpoint, this should use a DgsDataLoader to avoid N+1 queries.
        val team = teamService.getTeamById(task.projectId, userId, teamId) ?: return null
        
        return Team(
            id = team.id,
            name = team.name,
            projectId = team.projectId,
            parentTeamId = team.parentTeamId,
            createdAt = team.createdAt.toString(),
            members = emptyList(),
            tasks = emptyList()
        )
    }

    @DgsData(parentType = DgsConstants.TASK.TYPE_NAME)
    fun assignedTeamMember(
        dfe: DgsDataFetchingEnvironment
    ): User? {
        val task = dfe.getSource<ProjectTask>()!!
        val memberId = task.assignedTeamMember ?: return null
        return User(id = memberId, projects = emptyList())
    }

    @DgsData(parentType = DgsConstants.TASK.TYPE_NAME)
    fun createdAt(dfe: DgsDataFetchingEnvironment): String {
        return dfe.getSource<ProjectTask>()!!.createdAt.toString()
    }

    @DgsData(parentType = DgsConstants.TASK.TYPE_NAME)
    fun updatedAt(dfe: DgsDataFetchingEnvironment): String? {
        return dfe.getSource<ProjectTask>()!!.updatedAt?.toString()
    }

    @DgsData(parentType = DgsConstants.TASK.TYPE_NAME)
    fun version(dfe: DgsDataFetchingEnvironment): Int {
        return dfe.getSource<ProjectTask>()!!.version.toInt()
    }
}
