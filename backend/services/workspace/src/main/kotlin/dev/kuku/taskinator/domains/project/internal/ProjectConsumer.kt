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

    private val TOPIC = "workspace-activity"

    @Transactional
    @KafkaListener(topics = ["workspace-activity"], groupId = "project-service-group")
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
                            kafkaTemplate.send(TOPIC, event.projectId, TeamEvent.ProjectTeamsPurgeRequested(
                                projectId = event.projectId,
                                userId = event.userId
                            ))
                            kafkaTemplate.send(TOPIC, event.projectId, TaskEvent.ProjectTasksPurgeRequested(
                                projectId = event.projectId,
                                userId = event.userId
                            ))
                        }
                        is ProjectEvent.ProjectMembersRemoved -> {
                            log.info { "ProjectConsumer: Orchestrating member cleanup for project ${event.projectId}" }
                            
                            // Trigger async member purge in Teams and Tasks
                            kafkaTemplate.send(TOPIC, event.projectId, TeamEvent.MemberTeamCleanupRequested(
                                projectId = event.projectId,
                                userId = event.userId,
                                memberIds = event.memberIds
                            ))
                            kafkaTemplate.send(TOPIC, event.projectId, TaskEvent.MemberTaskCleanupRequested(
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
