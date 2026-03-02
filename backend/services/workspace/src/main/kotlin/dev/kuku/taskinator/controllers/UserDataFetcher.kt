package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsEntityFetcher
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.PaginationInput
import dev.kuku.taskinator.generated.types.Project
import dev.kuku.taskinator.generated.types.User
import org.springframework.web.bind.annotation.RequestHeader

/**
 * UserDataFetcher handles Federation-specific queries for the User type.
 * In Taskinator, the Identity service owns 'User', but the Workspace service 
 * extends it to provide 'projects'.
 */
@DgsComponent
class UserDataFetcher(
    private val projectService: ProjectService
) {

    /**
     * Entity fetcher for the User type.
     * When the Gateway needs to resolve a User in the Workspace service, 
     * it sends the 'id' (from the @key).
     */
    @DgsEntityFetcher(name = DgsConstants.USER.TYPE_NAME)
    fun fetchUser(values: Map<String, Any>): User {
        return User(id = values["id"] as String, projects = emptyList())
    }

    /**
     * Resolves the 'projects' field for a User.
     */
    @DgsData(parentType = DgsConstants.USER.TYPE_NAME, field = DgsConstants.USER.Projects)
    fun projects(
        @InputArgument("input") input: PaginationInput?,
        @RequestHeader("X-User-Id") userId: String,
        dfe: com.netflix.graphql.dgs.DgsDataFetchingEnvironment
    ): List<Project> {
        val user = dfe.getSource<User>()!!
        val limit = input?.limit ?: 10
        val offset = input?.offset ?: 0

        // Get projects that the user created
        return projectService.getProjectsByUser(user.id, limit, offset).map {
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
}
