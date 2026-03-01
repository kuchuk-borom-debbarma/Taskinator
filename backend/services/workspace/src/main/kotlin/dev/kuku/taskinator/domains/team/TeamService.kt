package dev.kuku.taskinator.domains.team

import org.springframework.stereotype.Service

data class UpdateTeamFields(
    val version: Long,
    val teamName: String? = null,
    val parentTeamId: String? = null
)

@Service
/**
 * Team service handles team management of a project.
 * Teams have hierarchy by default, and it's main purpose is to make it easy to assign sub-tasks.
 * In an project with lots of team it may be hard to determine the teams to assign so we have team hierarchy to make it easier. <br>
 * It doesn't have any other purpose except this for now. <br>
 * In future we can set rules for project so that we do not allow assigning tasks to teams that are not children of the parent team and so on.
 */
interface TeamService {
    ///Create a team for a project, optionally set its parents too
    fun createTeam(projectId: String, userId: String, teamName: String, parentTeamId: String?, teamId: String? = null): ProjectTeam?

    ///Update the name of the team
    fun updateTeam(projectId: String, userId: String, teamId: String, toUpdate: UpdateTeamFields)

    ///Delete a team using optimistic locking. Returns descendant IDs for async cleanup.
    fun deleteTeam(projectId: String, userId: String, teamId: String, version: Long): List<String>

    ///Get all teams in a project with pagination
    fun getTeamsByProject(projectId: String, userId: String, limit: Int, offset: Int): List<ProjectTeam>

    ///Add team members
    fun addTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)

    ///Remove team members
    fun removeTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)

    fun getTeamById(projectId: String,userId:String, teamId: String): ProjectTeam?

    fun getChildren(projectId:String, userId: String, teamId: String, limit: Int, offset: Int): List<ProjectTeam>
}