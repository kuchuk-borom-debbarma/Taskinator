package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.ProjectTeam
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
        teamId: String,
        teamName: String,
        parentTeamId: String?,
        idempotencyKey: String
    ): ProjectTeam?

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
    fun findTeamsByProject(projectId: String, limit: Int, offset: Int): List<ProjectTeam>

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
     * Finds members of a specific team with pagination.
     */
    fun findTeamMembers(projectId: String, teamId: String, limit: Int, offset: Int): List<dev.kuku.taskinator.domains.team.ProjectTeamMember>

    /**
     * Checks which of the provided IDs are actually members of the parent project.
     */
    fun filterProjectMembers(projectId: String, memberIds: List<String>): List<String>

    /**
     * Finds a specific team by its ID.
     */
    fun findTeamById(projectId: String, teamId: String): ProjectTeam?

    /**
     * Returns the owner ID of the project.
     */
    fun findProjectOwner(projectId: String): String?
    fun getChildrenTeam(projectId: String, userId: String, teamId: String, limit: Int, offset: Int): List<ProjectTeam>

    /**
     * Performs a cascading chunky delete of all teams, members, and closure paths 
     * for a given project.
     */
    fun deleteTeamsByProjectBatch(projectId: String, limit: Int): Int

    /**
     * Fetches all descendant team IDs for a given team using the closure table.
     */
    fun getDescendantTeamIds(projectId: String, teamId: String): List<String>

    /**
     * Deletes a specific batch of teams, their members, and closure paths.
     */
    fun deleteSpecificTeamsBatch(projectId: String, teamIds: List<String>, limit: Int): Int

    /**
     * Removes specific project members from all teams they belong to.
     */
    fun deleteTeamMembersForMembersBatch(projectId: String, memberIds: List<String>, limit: Int): Int
}
