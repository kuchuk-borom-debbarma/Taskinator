package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.TaskEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import dev.kuku.taskinator.util.KafkaConstants.BATCH_SIZE_TASK
import dev.kuku.taskinator.util.KafkaConstants.GROUP_ID_TASK
import dev.kuku.taskinator.util.KafkaConstants.TOPIC_WORKSPACE_ACTIVITY

private val log = KotlinLogging.logger {}

/**
 * TaskConsumer is the heavy worker responsible for purging tasks, 
 * unassigning deleted teams/members, and recursive sub-task cleanups.
 */
@Service
class TaskConsumer(
    private val taskQueries: TaskQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    @Transactional
    @KafkaListener(topics = [TOPIC_WORKSPACE_ACTIVITY], groupId = GROUP_ID_TASK)
    fun consume(events: List<Any>, ack: Acknowledgment) {
        try {
            events.forEach { event ->
                if (event is TaskEvent) {
                    when (event) {
                        is TaskEvent.TaskDeleted -> {
                            log.info { "TaskConsumer: Orchestrating cleanup for deleted task ${event.taskId}" }
                            kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, TaskEvent.SubTasksPurgeRequested(
                                projectId = event.projectId,
                                userId = event.userId,
                                parentPath = event.path
                            ))
                        }
                        is TaskEvent.ProjectTasksPurgeRequested -> handleProjectPurge(event)
                        is TaskEvent.SubTasksPurgeRequested -> handleSubTasksPurge(event)
                        is TaskEvent.TeamTasksUnassignRequested -> handleTeamUnassign(event)
                        is TaskEvent.MemberTaskCleanupRequested -> handleMemberCleanup(event)
                        else -> log.debug { "TaskConsumer: Processing ${event::class.simpleName}" }
                    }
                }
            }
            ack.acknowledge()
        } catch (e: Exception) {
            log.error(e) { "TaskConsumer failed to process batch." }
            throw e
        }
    }

    private fun handleProjectPurge(event: TaskEvent.ProjectTasksPurgeRequested) {
        val deleted = taskQueries.deleteTasksByProjectBatch(event.projectId, null, BATCH_SIZE_TASK)
        if (deleted >= BATCH_SIZE_TASK) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }

    private fun handleSubTasksPurge(event: TaskEvent.SubTasksPurgeRequested) {
        val deleted = taskQueries.deleteTasksByProjectBatch(event.projectId, event.parentPath, BATCH_SIZE_TASK)
        if (deleted >= BATCH_SIZE_TASK) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }

    private fun handleTeamUnassign(event: TaskEvent.TeamTasksUnassignRequested) {
        val updated = taskQueries.unassignTasksForTeamsBatch(event.projectId, event.teamIds, BATCH_SIZE_TASK)
        if (updated >= BATCH_SIZE_TASK) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }

    private fun handleMemberCleanup(event: TaskEvent.MemberTaskCleanupRequested) {
        val updated = taskQueries.unassignTasksForMembersBatch(event.projectId, event.memberIds, BATCH_SIZE_TASK)
        if (updated >= BATCH_SIZE_TASK) kafkaTemplate.send(TOPIC_WORKSPACE_ACTIVITY, event.projectId, event)
    }
}
