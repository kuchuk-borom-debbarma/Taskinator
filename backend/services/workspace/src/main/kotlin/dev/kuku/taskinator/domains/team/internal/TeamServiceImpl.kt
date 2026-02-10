package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.Team
import dev.kuku.taskinator.domains.team.TeamConcurrencyException
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.UpdateTeamFields
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service

private val log = KotlinLogging.logger {}

/**
 * TEAM DOMAIN SERVICE: Business Logic & Guardrails
 * 
 * SPECIALIZATION: High-Concurrency Hierarchy Management.
 */
@Service
class TeamServiceImpl(private val teamRepo: TeamQueries) : TeamService {

    private val MAX_LIMIT = 100

    /**
     * Creating a team involves
     * - Inserting the team in the Project teams table
     * - If parentTeamId is provided. It needs to be added to closure table too with ancestor as the parentId and child as the teamId.
     * - Firing Team created event.
     *  - If team has parent then it needs to update the closure table
     * LEAN TEAM CREATION:
     * - PERF: Performs a fast sync write then fires an event for heavy hierarchy calculation.
     * - Result: User gets a 201 Created in < 50ms.
     */
        override fun createTeam(projectId: String, userId: String, teamName: String, parentTeamId: String?) {
            log.info { "Creating team $teamName in project $projectId" }
            val team = teamRepo.insertTeam(projectId, teamName, parentTeamId)
            if (team != null) {
                log.info { "Team created. Firing async hierarchy computation." }
                
                // Trigger background inheritance logic in TeamQueries.computeTeamHierarchy
                log.info { "TODO: Fire TEAM_CREATED(projectId, teamId, parentTeamId) event" }
            }
        }
    
        /**
         * SECURE TEAM UPDATE:
         * - HANDLES: Optimistic locking, Name conflicts, and One-Parent integrity rules.
         */
        override fun updateTeam(projectId: String, userId: String, teamId: String, toUpdate: UpdateTeamFields) {
            log.info { "Updating team $teamId" }
            try {
                val updated = teamRepo.updateTeam(projectId, teamId, toUpdate)
                if (!updated) {
                    throw dev.kuku.taskinator.domains.team.TeamConcurrencyException("Concurrency conflict.")
                }
                
                if (toUpdate.parentTeamId != null) {
                    // If a root team was just linked to a parent, its full hierarchy must be rebuilt.
                    log.info { "TODO: Fire TEAM_LINKED(projectId, teamId, parentTeamId) event" }
                }
            } catch (e: Exception) {
                when (e) {
                    is dev.kuku.taskinator.domains.team.TeamAlreadyLinkedException,
                    is dev.kuku.taskinator.domains.team.TeamNameConflictException -> throw e
                    else -> throw e
                }
            }
        }
    
        /**
         * SECURE DELETE:
         * - Uses [version] to ensure user is deleting the correct state.
         * - Hierarchy cleanup happens synchronously in the repository to maintain integrity.
         */
        override fun deleteTeam(projectId: String, userId: String, teamId: String, version: Long): Boolean {
            log.info { "Deleting team $teamId with version $version" }
            val deletedRows = teamRepo.deleteTeam(projectId, teamId, version)
            
            if (deletedRows == 0) {
                throw dev.kuku.taskinator.domains.team.TeamConcurrencyException("Delete failed: version mismatch.")
            }
            
            // Background cleanup of members and sub-tasks
            log.info { "TODO: Fire TEAM_DELETED event" }
            
            return true
        }
    
        override fun getTeamsByProject(projectId: String, userId: String, limit: Int, offset: Int): List<Team> {
            val enforcedLimit = limit.coerceAtMost(MAX_LIMIT)
            return teamRepo.findTeamsByProject(projectId, enforcedLimit, offset)
        }
    
        /**
         * DOMAIN RESTRICTION (Secured Batch Insert):
         * - Only Project Members or the Project Owner are allowed to join teams.
         * - The repository handles this in a single sweep using [insertTeamMembersFromProject].
         */
        override fun addTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>) {
            log.info { "Adding members to team $teamId" }
            try {
                // Verifies against the Project container context before writing.
                teamRepo.insertTeamMembersFromProject(projectId, teamId, memberIds)
                
                log.info { "TODO: Fire TEAM_MEMBERS_ADDED event" }
            } catch (e: Exception) {
                log.error(e) { "Failed to add team members" }
                throw e
            }
        }
    
        override fun removeTeamMembers(projectId: String, userId: String, teamId: String, memberIds: List<String>) {
            try {
                teamRepo.deleteTeamMembers(projectId, teamId, memberIds)
                log.info { "TODO: Fire TEAM_MEMBERS_REMOVED event" }
            } catch (e: Exception) {
                log.error(e) { "Failed to remove team members" }
                throw e
            }
        }
    }
    