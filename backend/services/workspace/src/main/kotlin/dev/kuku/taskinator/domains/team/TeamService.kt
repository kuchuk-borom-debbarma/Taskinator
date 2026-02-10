package dev.kuku.taskinator.domains.team

import org.springframework.stereotype.Service

data class UpdateTeamFields(
    val version: Long,
    val teamName: String? = null,
    val parentTeamId: String? = null
)

@Service
/**
 * Team service handles team management of a project
 */
interface TeamService {
    ///Create a team for a project, optionally set its parents too
    fun createTeam(projectId: String, userId: String, teamName: String, parentTeamId: String?)

    ///Update the name of the team
    fun updateTeam(projectId: String, userId: String, teamId: String, toUpdate: UpdateTeamFields)

    ///Delete a team using optimistic locking
    fun deleteTeam(projectId: String, userId: String, teamId: String, version: Long): Boolean

    ///Get all teams in a project with pagination
    fun getTeamsByProject(projectId: String, userId: String, limit: Int, offset: Int): List<Team>

    ///Add team members
    fun addTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)

    ///Remove team members
    fun removeTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)

    //TODO get functions
}