package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.Team
import dev.kuku.taskinator.domains.team.UpdateTeamFields

interface TeamQueries {
    /**
     * Inserts a team and sets up its initial closure table entries.
     * Validates that the user is the project owner or a member.
     * Validates that the parentTeamId is valid
     */
    fun insertTeam(
        projectId: String,
        userId: String,
        teamName: String,
        parentTeamId: String?
    ): Team?

    /**
     * Heavy hierarchy computation to be called by an async event listener.
     */
    fun computeTeamHierarchy(projectId: String, teamId: String, parentTeamId: String)

    /**
     * Updates team details with optimistic locking.
     */
    fun updateTeam(
        projectId: String,
        teamId: String,
        toUpdate: UpdateTeamFields
    ): Boolean

    /**
     * Deletes a team and its associated hierarchy entries using optimistic locking.
     */
    fun deleteTeam(projectId: String, teamId: String, version: Long): Int

    /**
     * Finds all teams belonging to a project with pagination.
     */
    fun findTeamsByProject(projectId: String, limit: Int, offset: Int): List<Team>

    /**
     * Batch inserts members into a team with denormalized info.
     */
    fun insertTeamMembers(
        projectId: String,
        teamId: String,
        memberIds: List<String>
    )


    /**
     * Batch removes members from a team.
     */
    fun deleteTeamMembers(
        projectId: String,
        teamId: String,
        memberIds: List<String>
    )

    /**
     * Checks which of the provided IDs are actually members of the parent project.
     */
    fun filterProjectMembers(projectId: String, memberIds: List<String>): List<String>

    /**
     * Finds a specific team by its ID.
     */
    fun findTeamById(projectId: String, teamId: String): Team?

    /**
     * Returns the owner ID of the project.
     */
    fun findProjectOwner(projectId: String): String?
}
