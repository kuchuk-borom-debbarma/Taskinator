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
 * Handles the Universal Cascade logic for Team deletions, Sub-tree deletions, 
 * and Member cleanups.
 */
@Component
class TeamEventHandler(
    private val teamService: TeamService,
    private val teamRepo: TeamQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    private val TOPIC = "workspace-activity"
    private val DELETE_BATCH_SIZE = 1000

    fun handle(event: TeamEvent) {
        try {
            when (event) {
                is TeamEvent.TeamDeleted -> {
                    log.info { "TeamConsumer: Orchestrating cleanup fan-out for deleted team ${event.teamId}" }
                    
                    // Route to chunky sub-team deletion
                    if (event.descendantTeamIds.isNotEmpty()) {
                        kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.SubTeamsPurgeRequested(
                            projectId = event.projectId,
                            userId = event.userId,
                            teamIds = event.descendantTeamIds
                        ))
                    }
                    
                    // Route to task domain to unassign tasks for the root team AND its descendants
                    val allAffectedTeams = event.descendantTeamIds + event.teamId
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.TeamTasksUnassignRequested(
                        projectId = event.projectId,
                        userId = event.userId,
                        teamIds = allAffectedTeams
                    ))
                }
                is TeamEvent.TeamCreated -> log.info { "TeamConsumer: Processing TeamCreated: ${event.teamId}" }
                is TeamEvent.TeamRenamed -> log.info { "TeamConsumer: Processing TeamRenamed: ${event.teamId}" }
                is TeamEvent.TeamMembersAdded -> log.info { "TeamConsumer: Processing TeamMembersAdded" }
                is TeamEvent.TeamMembersRemoved -> log.info { "TeamConsumer: Processing TeamMembersRemoved" }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TeamEventHandler for event: $event" }
            throw e
        }
    }

    // --- CASCADE HANDLERS ---

    fun handleCleanup(event: CleanupEvent.ProjectTeamsPurgeRequested) {
        log.info { "TeamConsumer: Processing FULL chunky cleanup for project ${event.projectId}" }
        val deletedCount = teamRepo.deleteTeamsByProjectBatch(event.projectId, DELETE_BATCH_SIZE)
        if (deletedCount >= DELETE_BATCH_SIZE) {
            log.info { "TeamConsumer: More teams may exist, re-emitting ProjectTeamsPurgeRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }

    fun handleSubTeamsPurge(event: CleanupEvent.SubTeamsPurgeRequested) {
        log.info { "TeamConsumer: Processing SUB-TREE chunky cleanup for project ${event.projectId}" }
        val deletedCount = teamRepo.deleteSpecificTeamsBatch(event.projectId, event.teamIds, DELETE_BATCH_SIZE)
        if (deletedCount >= DELETE_BATCH_SIZE) {
            log.info { "TeamConsumer: More sub-teams may exist, re-emitting SubTeamsPurgeRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }

    fun handleMemberCleanup(event: CleanupEvent.MemberCleanupRequested) {
        log.info { "TeamConsumer: Processing MEMBER chunky cleanup for project ${event.projectId}" }
        val deletedCount = teamRepo.deleteTeamMembersForMembersBatch(event.projectId, event.memberIds, DELETE_BATCH_SIZE)
        if (deletedCount >= DELETE_BATCH_SIZE) {
            log.info { "TeamConsumer: More team memberships may exist, re-emitting MemberCleanupRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }
}
