package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.DgsEntityFetcher
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectMemberSortKey
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.task.GetTasksFilterParam
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*

import org.springframework.web.bind.annotation.RequestHeader

/**
 * Resolves fields of project type
 */
@DgsComponent
class ProjectDataFetcher(
    private val projectService: ProjectService,
    private val teamService: TeamService,
    private val taskService: TaskService
) {

    @DgsEntityFetcher(name = DgsConstants.PROJECT.TYPE_NAME)
    fun fetchProject(values: Map<String, Any>, @RequestHeader("X-User-Id") userId: String): Project? {
        val id = values["id"] as String
        return projectService.getProjectById(id, userId)?.let {
            Project(
                id = it.id,
                name = it.name,
                owner = User(id = it.owner, projects = emptyList()),
                description = it.description,
                createdAt = it.createdAt.toString(),
                updatedAt = it.updatedAt.toString(),
                teams = emptyList(),
                members = emptyList(),
                tasks = emptyList()
            )
        }
    }

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME)
    fun owner(dfe: DgsDataFetchingEnvironment): User {
        val project = dfe.getSource<Project>()!!
        return User(id = project.owner.id, projects = emptyList()) 
    }

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME)
    fun teams(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.TEAMS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<Team> {
        val project = dfe.getSource<Project>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0
        
        return teamService.getTeamsByProject(project.id, userId, limit, offset).map {
            Team(
                id = it.id,
                name = it.name,
                projectId = it.projectId,
                parentTeamId = it.parentTeamId,
                createdAt = it.createdAt.toString(),
                members = emptyList(),
                tasks = emptyList()
            )
        }
    }

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME)
    fun members(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.MEMBERS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<ProjectMember> {
        val project = dfe.getSource<Project>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0

        return projectService.getProjectMembers(
            project.id, 
            userId, 
            ProjectMemberSortKey.ADDED, 
            offset, 
            limit
        ).map {
            ProjectMember(
                user = User(id = it.memberId, projects = emptyList()),
                createdAt = it.createdAt.toString()
            )
        }
    }

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME)
    fun tasks(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.TASKS_INPUT_ARGUMENT.Input) input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String
    ): List<dev.kuku.taskinator.domains.task.ProjectTask> {
        val project = dfe.getSource<Project>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0

        return taskService.getTasks(
            project.id, 
            userId,
            GetTasksFilterParam(
                isUnassigned = true,
                limit = limit,
                offset = offset
            )
        )
    }
}
