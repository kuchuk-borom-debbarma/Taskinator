package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectMemberSortKey
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*

/**
 * Resolves fields of project type
 */
@DgsComponent
class ProjectDataFetcher(
    private val projectService: ProjectService,
    private val teamService: TeamService,
    private val taskService: dev.kuku.taskinator.domains.task.TaskService
) {

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME, field = DgsConstants.PROJECT.Owner)
    fun owner(dfe: DgsDataFetchingEnvironment): User {
        val project = dfe.getSource<Project>()!!
        return User(id = "owner-id", projects = emptyList()) 
    }

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME, field = DgsConstants.PROJECT.Teams)
    fun teams(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.TEAMS_INPUT_ARGUMENT.Input) input: PaginationInput?
    ): List<Team> {
        val project = dfe.getSource<Project>()!!
        val userId = "user-1"
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

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME, field = DgsConstants.PROJECT.Members)
    fun members(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.MEMBERS_INPUT_ARGUMENT.Input) input: PaginationInput?
    ): List<ProjectMember> {
        val project = dfe.getSource<Project>()!!
        val userId = "user-1"
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

    @DgsData(parentType = DgsConstants.PROJECT.TYPE_NAME, field = DgsConstants.PROJECT.Tasks)
    fun tasks(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.PROJECT.TASKS_INPUT_ARGUMENT.Input) input: PaginationInput?
    ): List<Task> {
        val project = dfe.getSource<Project>()!!
        val userId = "user-1"
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0

        return taskService.getTasks(
            project.id, 
            userId, 
            dev.kuku.taskinator.domains.task.GetTasksFilterParam(
                isUnassigned = true,
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
                createdAt = "" // Placeholder for now
            )
        }
    }
}
