package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.TaskEvent
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val log = KotlinLogging.logger {}

@Service
class TaskConsumer(
    private val taskQueries: TaskQueries
) {

    @Transactional
    @KafkaListener(topics = ["workspace-activity"])
    fun consume(events: List<TaskEvent>, ack: Acknowledgment) {
        log.info { "Received batch of ${events.size} events from Kafka" }

        try {
            // Group by event type for processing
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

            // 1. Handle Task Creation
            createdEvents.forEach { event ->
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
            // 2. Handle Status Updates
            statusUpdateEvents.forEach { event ->
                taskQueries.updateTaskStatus(
                    event.projectId, event.userId, event.taskId, event.version, event.status
                )
            }

            // 3. Handle Assignments
            assignmentEvents.forEach { event ->
                taskQueries.assignTask(
                    event.projectId, event.userId, event.taskId, event.version,
                    dev.kuku.taskinator.domains.task.AssignTaskParam(event.teamId, event.teamMemberId)
                )
            }

            // 4. Handle Deletions
            deleteEvents.forEach { event ->
                taskQueries.deleteTask(event.projectId, event.userId, event.taskId, event.version)
            }
            
            // Manual Offset Commit
            ack.acknowledge()
            log.info { "Successfully processed and committed batch of ${events.size} events" }

        } catch (e: Exception) {
            log.error(e) { "Failed to process Kafka batch. Transaction rolled back." }
            throw e // Re-throw to trigger Kafka retry
        }
    }

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
