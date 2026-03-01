package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.team.TeamEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import dev.kuku.taskinator.util.KafkaConstants.GROUP_ID_PROJECT
import dev.kuku.taskinator.util.KafkaConstants.TOPIC_WORKSPACE_ACTIVITY

private val log = KotlinLogging.logger {}

/**
 * ProjectConsumer handles events related to Project lifecycle and 
 * high-level orchestration of cross-domain cleanups.
 */
@Service
class ProjectConsumer(
    private val projectRepo: ProjectQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    @Transactional
    @KafkaListener(topics = [TOPIC_WORKSPACE_ACTIVITY], groupId = GROUP_ID_PROJECT)
    fun consume(events: List<Any>, ack: Acknowledgment) {
        try {
            events.forEach { event ->
                if (event is ProjectEvent) {
                    when (event) {
                        is ProjectEvent.ProjectDeleted -> {
                            log.info { "ProjectConsumer: Orchestrating cleanup fan-out for project ${event.projectId}" }
                            
                            // 1. Metadata cleanup
                            projectRepo.deleteProjectMembersByProject(event.projectId)
                            
                            // 2. Trigger async cleanup in Team and Task domains
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TeamEvent.ProjectTeamsPurgeRequested(
                                projectId = event.projectId,
                                userId = event.userId
                            ))
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TaskEvent.ProjectTasksPurgeRequested(
                                projectId = event.projectId,
                                userId = event.userId
                            ))
                        }
                        is ProjectEvent.ProjectMembersRemoved -> {
                            log.info { "ProjectConsumer: Orchestrating member cleanup for project ${event.projectId}" }
                            
                            // Trigger async member purge in Teams and Tasks
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TeamEvent.MemberTeamCleanupRequested(
                                projectId = event.projectId,
                                userId = event.userId,
                                memberIds = event.memberIds
                            ))
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TaskEvent.MemberTaskCleanupRequested(
                                projectId = event.projectId,
                                userId = event.userId,
                                memberIds = event.memberIds
                            ))
                        }
                        else -> log.debug { "ProjectConsumer: Processing ${event::class.simpleName}" }
                    }
                }
            }
            ack.acknowledge()
        } catch (e: Exception) {
            log.error(e) { "ProjectConsumer failed to process batch." }
            throw e
        }
    }
}
