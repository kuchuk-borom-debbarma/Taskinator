package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

/**
 * TeamEventHandler is the background worker for the Team domain.
 * 
 * It manages the asynchronous lifecycle of teams, including hierarchy 
 * persistence and member management. By using the Unified Stream, 
 * it ensures that a team is only created AFTER its parent project exists.
 */
@Component
class TeamEventHandler(
    private val teamService: TeamService,
    private val teamRepo: TeamQueries
) {

    /**
     * Routes incoming TeamEvents to the correct persistence logic.
     */
    fun handle(event: TeamEvent) {
        try {
            when (event) {
                is TeamEvent.TeamCreated -> {
                    log.info { "Processing background hierarchy for TeamCreated: ${event.teamId}" }
                    /**
                     * TODO: BACKGROUND HIERARCHY COMPUTATION
                     * 1. Call teamRepo.computeTeamHierarchy(projectId, teamId, parentTeamId)
                     * 2. This expands all ancestral paths in the closure table.
                     */
                }
                is TeamEvent.TeamRenamed -> {
                    log.info { "Processing background sync for TeamRenamed: ${event.teamId}" }
                    // Placeholder: No immediate background task needed for renames, 
                    // but could be used to sync denormalized names in other tables/services.
                }
                is TeamEvent.TeamDeleted -> {
                    log.info { "Processing background cleanup for TeamDeleted: ${event.teamId}" }
                    /**
                     * TODO: BACKGROUND CLEANUP
                     * 1. Remove all members from this team (team_members table).
                     * 2. Unassign tasks assigned to this team.
                     * 3. Full cleanup of closure table entries for this team's subtree.
                     */
                }
                is TeamEvent.TeamMembersAdded -> {
                    log.info { "Processing background stats for TeamMembersAdded: ${event.teamId}" }
                    /**
                     * TODO: STAT UPDATES
                     * 1. Update denormalized member counts on Team or Project.
                     */
                }
                is TeamEvent.TeamMembersRemoved -> {
                    log.info { "Processing background stats for TeamMembersRemoved: ${event.teamId}" }
                    /**
                     * TODO: STAT UPDATES
                     * 1. Update denormalized member counts on Team or Project.
                     */
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TeamEventHandler for event: $event" }
            throw e
        }
    }
}
