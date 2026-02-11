package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsQuery
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.Project
import dev.kuku.taskinator.generated.types.ProjectInput
import dev.kuku.taskinator.generated.types.Team
import dev.kuku.taskinator.generated.types.TeamInput
import dev.kuku.taskinator.generated.types.User
import java.time.OffsetDateTime

@DgsComponent
class RootDataFetcher(private val projectService: ProjectService) {
    
    @DgsQuery(field = DgsConstants.QUERY.Project)
    fun project(@InputArgument input: ProjectInput): Project? {
        // Accessing ID via the type-safe input object
        val id = input.id
        
        return Project(
            id = id,
            name = "Input-Object Project",
            owner = User(id = "owner-1", projects = emptyList()),
            description = "Using ProjectInput for better type safety",
            createdAt = OffsetDateTime.now().toString(),
            teams = emptyList(),
            members = emptyList()
        )
    }

    @DgsQuery(field = DgsConstants.QUERY.Team)
    fun team(@InputArgument input: TeamInput): Team? {
        val id = input.id
        
        return Team(
            id = id,
            name = "Input-Object Team",
            projectId = "project-1",
            createdAt = OffsetDateTime.now().toString(),
            members = emptyList()
        )
    }
}
