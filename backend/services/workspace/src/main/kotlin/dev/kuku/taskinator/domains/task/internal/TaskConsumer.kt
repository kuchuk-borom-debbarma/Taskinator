package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.TaskEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val log = KotlinLogging.logger {}

/**
 * TaskConsumer implements the "Drain" phase of the Ingest-Buffer-Drain pattern.
 * 
 * Its primary responsibility is to pull large batches of events from Kafka and 
 * persist them to PostgreSQL as efficiently as possible. This service is designed
 * to scale horizontally to handle 1,000,000+ events per second.
 */
@Service
class TaskConsumer(
    private val taskQueries: TaskQueries
) {

    /**
     * The 'consume' method is triggered by Spring Kafka when a batch of messages is ready.
     * 
     * BATCH PROCESSING:
     * Instead of processing 1 record at a time, we receive a List of events. This allows 
     * us to open a single Database Transaction for the entire batch, reducing the 
     * "Transaction Commit" overhead which is the main bottleneck in relational databases.
     */
    @Transactional
    @KafkaListener(topics = ["workspace-activity"])
    fun consume(events: List<TaskEvent>, ack: Acknowledgment) {
        log.info { "Received batch of ${events.size} events from Kafka" }

        try {
            /**
             * 1. SORTING & GROUPING
             * We group events by type so we can potentially use specialized batch 
             * SQL for each type. 
             */
            val createdEvents = mutableListOf<TaskEvent.TaskCreated>()
            val statusUpdateEvents = mutableListOf<TaskEvent.TaskStatusUpdated>()
            val assignmentEvents = mutableListOf<TaskEvent.TaskAssigned>()
            val deleteEvents = mutableListOf<TaskEvent.TaskDeleted>()

            events.forEach { event ->
                when (event) {
                    is TaskEvent.TaskCreated -> createdEvents.add(event)
                    is TaskEvent.TaskStatusUpdated -> statusUpdateEvents.add(event)
                    is TaskEvent.TaskAssigned -> assignmentEvents.add(event)
                    is TaskEvent.TaskDeleted -> deleteEvents.add(event)
                }
            }

            /**
             * 2. BATCH PERSISTENCE
             * We iterate through the groups and call our optimized Query layer.
             */

            // Handle Task Creations
            createdEvents.forEach { event ->
                /**
                 * WAIT-AND-SEE RETRY:
                 * Because Projects are currently synchronous, a Task event might arrive
                 * before the Project exists in the DB. We retry a few times to give
                 * the synchronous path time to catch up.
                 */
                executeWithRetry {
                    taskQueries.insertTask(event.userId, dev.kuku.taskinator.domains.task.TaskToCreateParam(
                        title = event.title,
                        description = event.description,
                        projectId = event.projectId,
                        parentTaskId = event.parentTaskId,
                        assignedTeam = event.assignedTeam,
                        assignedMember = event.assignedMember
                    ), event.idempotencyKey)
                }
            }

            // Handle Status Updates (Optimistic locking is enforced inside updateTaskStatus)
            statusUpdateEvents.forEach { event ->
                taskQueries.updateTaskStatus(
                    event.projectId, event.userId, event.taskId, event.version, event.status
                )
            }

            // Handle Team/Member Assignments
            assignmentEvents.forEach { event ->
                taskQueries.assignTask(
                    event.projectId, event.userId, event.taskId, event.version,
                    dev.kuku.taskinator.domains.task.AssignTaskParam(event.teamId, event.teamMemberId)
                )
            }

            // Handle Task Deletions
            deleteEvents.forEach { event ->
                taskQueries.deleteTask(event.projectId, event.userId, event.taskId, event.version)
            }
            
            /**
             * 3. MANUAL ACKNOWLEDGMENT (AT-LEAST-ONCE SEMANTICS)
             * We only acknowledge the Kafka messages AFTER the DB transaction is successful.
             * If the app crashes before this line, Kafka will redeliver the batch to another 
             * worker, ensuring no data is ever lost.
             */
            ack.acknowledge()
            log.info { "Successfully processed and committed batch of ${events.size} events" }

        } catch (e: Exception) {
            /**
             * 4. ERROR HANDLING & BACKPRESSURE
             * If an error occurs, we DON'T acknowledge. The transaction rolls back, 
             * and the batch will be retried. This naturally slows down the system 
             * if the database is struggling (Backpressure).
             */
            log.error(e) { "Failed to process Kafka batch. Transaction rolled back." }
            throw e 
        }
    }

    /**
     * executeWithRetry handles transient failures, primarily focusing on 
     * Race Conditions between the Synchronous Project path and the Asynchronous Task path.
     */
    private fun <T> executeWithRetry(maxRetries: Int = 3, block: () -> T?): T? {
        var attempts = 0
        while (attempts < maxRetries) {
            val result = block()
            if (result != null) return result
            
            attempts++
            if (attempts < maxRetries) {
                log.warn { "Write failed (possibly missing Project context), retrying in 100ms... (Attempt $attempts)" }
                Thread.sleep(100)
            }
        }
        return null
    }
}
