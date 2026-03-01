package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.team.TeamEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val log = KotlinLogging.logger {}

/**
 * TeamConsumer manages the asynchronous lifecycle of teams, including 
 * hierarchy purges and member management.
 */
@Service
class TeamConsumer(
    private val teamRepo: TeamQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    private val TOPIC = "workspace-activity"
    private val BATCH_SIZE = 1000

    @Transactional
    @KafkaListener(topics = ["workspace-activity"], groupId = "team-service-group")
    fun consume(events: List<Any>, ack: Acknowledgment) {
        try {
            events.forEach { event ->
                if (event is TeamEvent) {
                    when (event) {
                        is TeamEvent.TeamDeleted -> {
                            log.info { "TeamConsumer: Fan-out for deleted team ${event.teamId}" }
                            
                            // 1. Purge descendants
                            if (event.descendantTeamIds.isNotEmpty()) {
                                kafkaTemplate.send(TOPIC, event.projectId, TeamEvent.SubTeamsPurgeRequested(
                                    projectId = event.projectId,
                                    userId = event.userId,
                                    teamIds = event.descendantTeamIds
                                ))
                            }
                            
                            // 2. Trigger task unassignment for the whole tree
                            val allAffectedTeams = event.descendantTeamIds + event.teamId
                            kafkaTemplate.send(TOPIC, event.projectId, TaskEvent.TeamTasksUnassignRequested(
                                projectId = event.projectId,
                                userId = event.userId,
                                teamIds = allAffectedTeams
                            ))
                        }
                        is TeamEvent.ProjectTeamsPurgeRequested -> handleProjectPurge(event)
                        is TeamEvent.SubTeamsPurgeRequested -> handleSubTeamsPurge(event)
                        is TeamEvent.MemberTeamCleanupRequested -> handleMemberCleanup(event)
                        else -> log.debug { "TeamConsumer: Processing ${event::class.simpleName}" }
                    }
                }
            }
            ack.acknowledge()
        } catch (e: Exception) {
            log.error(e) { "TeamConsumer failed to process batch." }
            throw e
        }
    }

    private fun handleProjectPurge(event: TeamEvent.ProjectTeamsPurgeRequested) {
        val deleted = teamRepo.deleteTeamsByProjectBatch(event.projectId, BATCH_SIZE)
        if (deleted >= BATCH_SIZE) kafkaTemplate.send(TOPIC, event.projectId, event)
    }

    private fun handleSubTeamsPurge(event: TeamEvent.SubTeamsPurgeRequested) {
        val deleted = teamRepo.deleteSpecificTeamsBatch(event.projectId, event.teamIds, BATCH_SIZE)
        if (deleted >= BATCH_SIZE) kafkaTemplate.send(TOPIC, event.projectId, event)
    }

    private fun handleMemberCleanup(event: TeamEvent.MemberTeamCleanupRequested) {
        val deleted = teamRepo.deleteTeamMembersForMembersBatch(event.projectId, event.memberIds, BATCH_SIZE)
        if (deleted >= BATCH_SIZE) kafkaTemplate.send(TOPIC, event.projectId, event)
    }
}
