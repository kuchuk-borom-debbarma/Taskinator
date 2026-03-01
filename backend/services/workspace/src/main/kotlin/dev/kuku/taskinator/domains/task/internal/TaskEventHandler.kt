package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.CleanupEvent
import dev.kuku.taskinator.domains.task.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

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
                is TaskEvent.TaskCreated -> {
                    log.info { "TaskConsumer: Processing background tasks for TaskCreated: ${event.taskId}" }
                }
                is TaskEvent.TaskStatusUpdated -> {
                    log.info { "TaskConsumer: Processing background tasks for TaskStatusUpdated: ${event.taskId}" }
                }
                is TaskEvent.TaskAssigned -> {
                    log.info { "TaskConsumer: Processing background tasks for TaskAssigned: ${event.taskId}" }
                }
                is TaskEvent.TaskDeleted -> {
                    log.info { "TaskConsumer: Processing background tasks for TaskDeleted: ${event.taskId}" }
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TaskEventHandler for event: $event" }
            throw e
        }
    }

    /**
     * CHUNKY DELETE:
     * Deletes tasks in small batches to avoid long-running DB transactions.
     * If the deleted count matches the limit, we assume more tasks exist and 
     * re-emit the event to continue in the next Kafka batch.
     */
    fun handleCleanup(event: CleanupEvent.TasksRequested) {
        log.info { "TaskConsumer: Processing chunky cleanup for project ${event.projectId}" }
        
        try {
            val deletedCount = taskQueries.deleteTasksByProjectBatch(event.projectId, DELETE_BATCH_SIZE)
            log.info { "TaskConsumer: Deleted $deletedCount tasks in this batch" }

            if (deletedCount >= DELETE_BATCH_SIZE) {
                log.info { "TaskConsumer: More tasks may exist, re-emitting CleanupEvent" }
                kafkaTemplate.send(TOPIC, event.projectId, event)
            } else {
                log.info { "TaskConsumer: Completed task cleanup for project ${event.projectId}" }
            }
        } catch (e: Exception) {
            log.error(e) { "TaskConsumer: Failed to process task cleanup for project ${event.projectId}" }
            throw e
        }
    }
}
