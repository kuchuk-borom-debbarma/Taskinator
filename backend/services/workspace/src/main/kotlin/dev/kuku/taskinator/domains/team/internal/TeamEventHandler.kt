package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.CleanupEvent
import dev.kuku.taskinator.domains.team.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

/**
 * TeamEventHandler is the background worker (Consumer) for the Team domain.
 * 
 * It manages the asynchronous lifecycle of teams, including hierarchy 
 * persistence and member management.
 */
@Component
class TeamEventHandler(
    private val teamService: TeamService,
    private val teamRepo: TeamQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    private val TOPIC = "workspace-activity"
    private val DELETE_BATCH_SIZE = 1000

    /**
     * Routes incoming TeamEvents to the correct persistence logic.
     */
    fun handle(event: TeamEvent) {
        try {
            when (event) {
                is TeamEvent.TeamCreated -> {
                    log.info { "TeamConsumer: Processing background hierarchy for TeamCreated: ${event.teamId}" }
                }
                is TeamEvent.TeamRenamed -> {
                    log.info { "TeamConsumer: Processing background sync for TeamRenamed: ${event.teamId}" }
                }
                is TeamEvent.TeamDeleted -> {
                    log.info { "TeamConsumer: Processing background cleanup for TeamDeleted: ${event.teamId}" }
                }
                is TeamEvent.TeamMembersAdded -> {
                    log.info { "TeamConsumer: Processing background stats for TeamMembersAdded: ${event.teamId}" }
                }
                is TeamEvent.TeamMembersRemoved -> {
                    log.info { "TeamConsumer: Processing background stats for TeamMembersRemoved: ${event.teamId}" }
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TeamEventHandler for event: $event" }
            throw e
        }
    }

    /**
     * CHUNKY DELETE:
     * Deletes teams and their associated closure tables/members in batches.
     * Re-emits the event if the batch limit was reached, indicating 
     * more teams may need cleanup.
     */
    fun handleCleanup(event: CleanupEvent.TeamsRequested) {
        log.info { "TeamConsumer: Processing chunky cleanup for project ${event.projectId}" }
        
        try {
            val deletedCount = teamRepo.deleteTeamsByProjectBatch(event.projectId, DELETE_BATCH_SIZE)
            log.info { "TeamConsumer: Deleted $deletedCount teams (including members/closure) in this batch" }

            if (deletedCount >= DELETE_BATCH_SIZE) {
                log.info { "TeamConsumer: More teams may exist, re-emitting CleanupEvent" }
                kafkaTemplate.send(TOPIC, event.projectId, event)
            } else {
                log.info { "TeamConsumer: Completed team cleanup for project ${event.projectId}" }
            }
        } catch (e: Exception) {
            log.error(e) { "TeamConsumer: Failed to process team cleanup for project ${event.projectId}" }
            throw e
        }
    }
}
