package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.web.bind.annotation.RequestHeader

/**
 * Resolves the root query and mutation
 */
@DgsComponent
class RootDataFetcher(
    private val projectService: ProjectService,
    private val teamService: TeamService
) {

    @DgsData(parentType = DgsConstants.QUERY_TYPE, field = DgsConstants.QUERY.Project)
    fun getProject(
        @InputArgument(DgsConstants.QUERY.PROJECT_INPUT_ARGUMENT.Input) input: ProjectInput,
        @RequestHeader("X-User-Id") userId: String
    ): Project? {
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
    fun getTeam(
        @InputArgument(DgsConstants.QUERY.TEAM_INPUT_ARGUMENT.Input) input: TeamInput,
        @RequestHeader("X-User-Id") userId: String
    ): Team? {
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

    @DgsData(parentType = DgsConstants.Mutation_TYPE, field = DgsConstants.MUTATION.Project)
    fun projectMutation(): ProjectMutation {
        return object : ProjectMutation {
            override val createProject: CreateProjectResponse get() = TODO()
            override val renameProject: GenericResponse get() = TODO()
            override val deleteProject: GenericResponse get() = TODO()
            override val addProjectMembers: GenericResponse get() = TODO()
            override val removeProjectMembers: GenericResponse get() = TODO()
        }
    }

    @DgsData(parentType = DgsConstants.Mutation_TYPE, field = DgsConstants.MUTATION.Team)
    fun teamMutation(): TeamMutation {
        return object : TeamMutation {
            override val createTeam: CreateTeamResponse get() = TODO()
            override val updateTeam: GenericResponse get() = TODO()
            override val deleteTeam: GenericResponse get() = TODO()
            override val addTeamMembers: GenericResponse get() = TODO()
            override val removeTeamMembers: GenericResponse get() = TODO()
        }
    }

    @DgsData(parentType = DgsConstants.Mutation_TYPE, field = DgsConstants.MUTATION.Task)
    fun taskMutation(): TaskMutation {
        return object : TaskMutation {
            override val createTask: CreateTaskResponse get() = TODO()
            override val assignTask: GenericResponse get() = TODO()
            override val updateTaskStatus: GenericResponse get() = TODO()
            override val deleteTask: GenericResponse get() = TODO()
        }
    }
}
