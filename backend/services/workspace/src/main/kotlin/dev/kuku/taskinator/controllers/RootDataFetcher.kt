package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*

/**
 * Resolves the root query and mutation
 */
@DgsComponent
class RootDataFetcher(
    private val projectService: ProjectService,
    private val teamService: TeamService
) {

    @DgsData(parentType = DgsConstants.QUERY_TYPE, field = DgsConstants.QUERY.Project)
    fun getProject(@InputArgument(DgsConstants.QUERY.PROJECT_INPUT_ARGUMENT.Input) input: ProjectInput): Project? {
        val userId = "user-1"
        return projectService.getProjectById(input.id, userId)?.let {
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

    @DgsData(parentType = DgsConstants.QUERY_TYPE, field = DgsConstants.QUERY.Team)
    fun getTeam(@InputArgument(DgsConstants.QUERY.TEAM_INPUT_ARGUMENT.Input) input: TeamInput): Team? {
        val userId = "user-1"
        return teamService.getTeamById("", userId, input.id)?.let {
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
}
