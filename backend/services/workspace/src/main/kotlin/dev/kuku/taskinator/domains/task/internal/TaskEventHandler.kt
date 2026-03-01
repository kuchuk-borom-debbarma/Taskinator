package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.CleanupEvent
import dev.kuku.taskinator.domains.task.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

/**
 * TaskEventHandler is the background worker (Consumer) for the Task domain.
 * 
 * Handles the Universal Cascade logic for Task deletions, Sub-task deletions,
 * and relational unassignments (Members and Teams).
 */
@Component
class TaskEventHandler(
    private val taskQueries: TaskQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    private val TOPIC = "workspace-activity"
    private val DELETE_BATCH_SIZE = 5000

    fun handle(event: TaskEvent) {
        try {
            when (event) {
                is TaskEvent.TaskDeleted -> {
                    log.info { "TaskConsumer: Orchestrating cleanup fan-out for deleted task ${event.taskId}" }
                    
                    // Route to chunky sub-task deletion
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.SubTasksPurgeRequested(
                        projectId = event.projectId,
                        userId = event.userId,
                        parentPath = event.path
                    ))
                }
                is TaskEvent.TaskCreated -> log.info { "TaskConsumer: Processing TaskCreated: ${event.taskId}" }
                is TaskEvent.TaskStatusUpdated -> log.info { "TaskConsumer: Processing TaskStatusUpdated: ${event.taskId}" }
                is TaskEvent.TaskAssigned -> log.info { "TaskConsumer: Processing TaskAssigned: ${event.taskId}" }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TaskEventHandler for event: $event" }
            throw e
        }
    }

    // --- CASCADE HANDLERS ---

    fun handleCleanup(event: CleanupEvent.ProjectTasksPurgeRequested) {
        log.info { "TaskConsumer: Processing FULL chunky cleanup for project ${event.projectId}" }
        val deletedCount = taskQueries.deleteTasksByProjectBatch(event.projectId, null, DELETE_BATCH_SIZE)
        if (deletedCount >= DELETE_BATCH_SIZE) {
            log.info { "TaskConsumer: More tasks may exist, re-emitting ProjectTasksPurgeRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }

    fun handleSubTasksPurge(event: CleanupEvent.SubTasksPurgeRequested) {
        log.info { "TaskConsumer: Processing SUB-TREE chunky cleanup for path ${event.parentPath}" }
        val deletedCount = taskQueries.deleteTasksByProjectBatch(event.projectId, event.parentPath, DELETE_BATCH_SIZE)
        if (deletedCount >= DELETE_BATCH_SIZE) {
            log.info { "TaskConsumer: More sub-tasks may exist, re-emitting SubTasksPurgeRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }

    fun handleTeamUnassign(event: CleanupEvent.TeamTasksUnassignRequested) {
        log.info { "TaskConsumer: Processing TEAM UNASSIGN chunky cleanup for project ${event.projectId}" }
        val updatedCount = taskQueries.unassignTasksForTeamsBatch(event.projectId, event.teamIds, DELETE_BATCH_SIZE)
        if (updatedCount >= DELETE_BATCH_SIZE) {
            log.info { "TaskConsumer: More tasks to unassign, re-emitting TeamTasksUnassignRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }

    fun handleMemberCleanup(event: CleanupEvent.MemberCleanupRequested) {
        log.info { "TaskConsumer: Processing MEMBER UNASSIGN chunky cleanup for project ${event.projectId}" }
        val updatedCount = taskQueries.unassignTasksForMembersBatch(event.projectId, event.memberIds, DELETE_BATCH_SIZE)
        if (updatedCount >= DELETE_BATCH_SIZE) {
            log.info { "TaskConsumer: More tasks to unassign, re-emitting MemberCleanupRequested" }
            kafkaTemplate.send(TOPIC, event.projectId, event)
        }
    }
}
