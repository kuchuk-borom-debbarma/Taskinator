package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsQuery
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.Project
import dev.kuku.taskinator.generated.types.Team
import dev.kuku.taskinator.generated.types.User
import java.time.OffsetDateTime

@DgsComponent
class RootDataFetcher(private val projectService: ProjectService) {
    
    @DgsQuery(field = DgsConstants.QUERY.Project)
    fun project(@InputArgument id: String): Project? {
        return Project(
            id = id,
            name = "Type-Safe Dummy Project",
            owner = User(id = "dummy-owner", projects = emptyList()),
            description = "This is a placeholder project for development",
            createdAt = OffsetDateTime.now().toString(),
            teams = emptyList(),
            members = emptyList()
        )
    }

    @DgsQuery(field = DgsConstants.QUERY.Team)
    fun team(@InputArgument id: String): Team? {
        return Team(
            id = id,
            name = "Type-Safe Dummy Team",
            projectId = "dummy-project-id",
            createdAt = OffsetDateTime.now().toString(),
            members = emptyList()
        )
    }
}
