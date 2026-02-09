package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.UpdateTeamFields
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val log = KotlinLogging.logger {}

@Service
class TeamServiceImpl(private val teamRepo: TeamQueries) : TeamService {

    /**
     * DoS Protection Guard: Prevents memory exhaustion from massive pagination requests.
     */
    private val MAX_LIMIT = 100

    /**
     * Creates a new team with async hierarchy support.
     * 
     * PERF: Lean sync insert + async closure table population.
     */
    override fun createTeam(projectId: String, userId: String, teamName: String, parentTeamId: String?) {
        log.info { "Creating team $teamName in project $projectId (Parent: $parentTeamId) by user $userId" }
        val team = teamRepo.insertTeam(projectId, teamName, parentTeamId)
        if (team != null) {
            log.info { "Team ${team.id} created successfully. Firing async hierarchy and stats events." }
            
            // This event triggers 'computeTeamHierarchy' in the background.
            TODO("Fire TEAM_CREATED(projectId, teamId, parentTeamId) event")
        }
    }

    /**
     * Updates team with concurrency protection and structural rules.
     * 
     * THROW: [TeamConcurrencyException] if version mismatch.
     * THROW: [TeamAlreadyLinkedException] if trying to re-parent an existing child.
     */
    override fun updateTeam(projectId: String, userId: String, teamId: String, toUpdate: UpdateTeamFields) {
        log.info { "Updating team $teamId in project $projectId by user $userId" }
        try {
            val updated = teamRepo.updateTeam(projectId, teamId, toUpdate)
            if (!updated) {
                throw dev.kuku.taskinator.domains.team.TeamConcurrencyException("Update failed: Team modified by another user or does not exist.")
            }
            
            if (toUpdate.parentTeamId != null) {
                // Moving a root team to a parent requires hierarchy re-computation.
                TODO("Fire TEAM_LINKED(projectId, teamId, parentTeamId) event")
            }
        } catch (e: Exception) {
            when (e) {
                is dev.kuku.taskinator.domains.team.TeamAlreadyLinkedException,
                is dev.kuku.taskinator.domains.team.TeamNameConflictException -> {
                    log.warn { "Update rejected: ${e.message}" }
                    throw e
                }
                else -> throw e
            }
        }
    }

    override fun deleteTeam(projectId: String, userId: String, teamId: String) {
        log.info { "Deleting team $teamId from project $projectId by user $userId" }
        val deleted = teamRepo.deleteTeam(projectId, teamId)
        if (deleted) {
            log.info { "Team $teamId deleted successfully" }
            
            // Asynchronous cleanup of related data.
            TODO("Fire TEAM_DELETED event for background cleanup of members and tasks")
        }
    }

    /**
     * Domain Restriction:
     * Only project members or the project owner are allowed to join a team.
     * This ensures team data remains isolated within the project container.
     */
    override fun addTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>) {
        //TODO use joins with projects table for single database call?
        log.info { "Adding members to team $teamId in project $projectId" }
        try {
            // 1. Ownership Context
            val ownerId = teamRepo.findProjectOwner(projectId) 
                ?: throw IllegalArgumentException("Project not found.")

            // 2. Member Filtering: Compare input IDs against the ProjectMembers source of truth.
            val membersInProject = teamRepo.filterProjectMembers(projectId, memberIds).toSet()
            
            // 3. Validation Logic: Valid if User == Owner OR User is in ProjectMembers table.
            val validMemberIds = memberIds.filter { it == ownerId || membersInProject.contains(it) }
            
            if (validMemberIds.isEmpty()) {
                log.warn { "No valid project members or owner found in request for team $teamId" }
                return
            }

            // 4. Optimized Batch Write
            teamRepo.insertTeamMembers(projectId, teamId, validMemberIds)
            
            TODO("Fire TEAM_MEMBERS_ADDED event")
        } catch (e: Exception) {
            log.error(e) { "Failed to add team members" }
            throw e
        }
    }

    override fun removeTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>) {
        log.info { "Removing ${memberIds.size} members from team $teamId in project $projectId" }
        try {
            teamRepo.deleteTeamMembers(projectId, teamId, memberIds)
            TODO("Fire TEAM_MEMBERS_REMOVED event")
        } catch (e: Exception) {
            log.error(e) { "Failed to remove team members" }
            throw e
        }
    }
}
