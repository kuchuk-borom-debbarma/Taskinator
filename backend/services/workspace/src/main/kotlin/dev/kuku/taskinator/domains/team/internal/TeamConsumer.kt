package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.team.TeamEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import dev.kuku.taskinator.util.KafkaConstants.BATCH_SIZE_TEAM
import dev.kuku.taskinator.util.KafkaConstants.GROUP_ID_TEAM
import dev.kuku.taskinator.util.KafkaConstants.TOPIC_WORKSPACE_ACTIVITY

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

    @Transactional
    @KafkaListener(topics = [TOPIC_WORKSPACE_ACTIVITY], groupId = GROUP_ID_TEAM)
    fun consume(events: List<Any>, ack: Acknowledgment) {
        try {
            events.forEach { event ->
                if (event is TeamEvent) {
                    when (event) {
                        is TeamEvent.TeamDeleted -> {
                            log.info { "TeamConsumer: Fan-out for deleted team ${event.teamId}" }
                            
                            // 1. Purge descendants
                            if (event.descendantTeamIds.isNotEmpty()) {
                                kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TeamEvent.SubTeamsPurgeRequested(
                                    projectId = event.projectId,
                                    userId = event.userId,
                                    teamIds = event.descendantTeamIds
                                ))
                            }
                            
                            // 2. Trigger task unassignment for the whole tree
                            val allAffectedTeams = event.descendantTeamIds + event.teamId
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TaskEvent.TeamTasksUnassignRequested(
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
        val deleted = teamRepo.deleteTeamsByProjectBatch(event.projectId, BATCH_SIZE_TEAM)
        if (deleted >= BATCH_SIZE_TEAM) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }

    private fun handleSubTeamsPurge(event: TeamEvent.SubTeamsPurgeRequested) {
        val deleted = teamRepo.deleteSpecificTeamsBatch(event.projectId, event.teamIds, BATCH_SIZE_TEAM)
        if (deleted >= BATCH_SIZE_TEAM) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }

    private fun handleMemberCleanup(event: TeamEvent.MemberTeamCleanupRequested) {
        val deleted = teamRepo.deleteTeamMembersForMembersBatch(event.projectId, event.memberIds, BATCH_SIZE_TEAM)
        if (deleted >= BATCH_SIZE_TEAM) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }
}
