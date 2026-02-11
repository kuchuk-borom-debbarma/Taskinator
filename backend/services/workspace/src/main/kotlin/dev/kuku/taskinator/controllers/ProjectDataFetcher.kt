package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.*
import dev.kuku.taskinator.domains.project.ProjectInfo
import dev.kuku.taskinator.domains.project.ProjectMember
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.Team
import org.springframework.web.bind.annotation.RequestHeader

/**
 * DGS Data Fetchers handle the mapping between GraphQL fields and our Services.
 */
@DgsComponent
class ProjectDataFetcher(
    private val projectService: ProjectService,
    private val teamService: TeamService
) {

    /**
     * EXTENSION: User.projects
     * 
     * This is called when someone queries: user { projects }
     * Even though we don't own 'User', the Gateway passes us the User ID.
     */
    @DgsData(parentType = "User", field = "projects")
    fun userProjects(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument limit: Int,
        @InputArgument offset: Int
    ): List<ProjectInfo> {
        // dfe.getSource() gives us the parent (the User object)
        val user = dfe.getSource<Map<String, Any>>()
        val userId = user["id"] as String
        return projectService.getProjectsByUser(userId, limit, offset)
    }

    /**
     * FIELD: Project.owner
     * 
     * Instead of returning a full User object, we return a "Representation".
     * This tells the Gateway: "I only know the ID. You go fetch the rest from Identity Service."
     */
    @DgsData(parentType = "Project", field = "owner")
    fun projectOwner(dfe: DgsDataFetchingEnvironment): Map<String, Any> {
        val project = dfe.getSource<ProjectInfo>()
        return mapOf("__typename" to "User", "id" to project.owner)
    }

    /**
     * FIELD: Project.members
     * Standard internal link from Project -> Member rows.
     */
    @DgsData(parentType = "Project", field = "members")
    fun projectMembers(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument limit: Int,
        @InputArgument offset: Int
    ): List<ProjectMember> {
        val project = dfe.getSource<ProjectInfo>()
        val userId = dfe.getUserId()
        return projectService.getProjectMembers(project.id, userId, dev.kuku.taskinator.domains.project.ProjectMemberSortKey.ADDED, offset, limit)
    }

    /**
     * FIELD: ProjectMember.user
     * Another Handshake: Converts a memberId into a User representation for the Gateway.
     */
    @DgsData(parentType = "ProjectMember", field = "user")
    fun projectMemberUser(dfe: DgsDataFetchingEnvironment): Map<String, Any> {
        val member = dfe.getSource<ProjectMember>()
        return mapOf("__typename" to "User", "id" to member.memberId)
    }

    /**
     * ENTITY FETCHERS:
     * 
     * These are special entry points for the Gateway.
     * If the Bun service has a Project ID and wants details, it asks the Gateway,
     * which then calls this function.
     */

    @DgsEntityFetcher(name = "Project")
    fun resolveProject(values: Map<String, Any>, dfe: DgsDataFetchingEnvironment): ProjectInfo? {
        val id = values["id"] as String
        return projectService.getProjectById(id, dfe.getUserId())
    }

    @DgsEntityFetcher(name = "Team")
    fun resolveTeam(values: Map<String, Any>): Team? {
        val id = values["id"] as String
        val projectId = values["projectId"] as? String ?: return null
        return teamService.getTeamById(projectId, id)
    }

    /**
     * Extract the Requester's ID.
     * In a federated setup, the Gateway usually puts the authenticated User ID 
     * into a header like 'x-user-id'.
     */
    private fun DgsDataFetchingEnvironment.getUserId(): String {
        return "SYSTEM" // TODO: Connect to SecurityContext or Headers
    }
}