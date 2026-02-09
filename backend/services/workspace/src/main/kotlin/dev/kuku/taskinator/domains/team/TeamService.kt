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

    ///Delete a team
    fun deleteTeam(projectId: String, userId: String, teamId: String)

    ///Add team members
    fun addTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)

    ///Remove team members
    fun removeTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>)
}