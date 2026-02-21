package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

@Component
class TaskEventHandler(private val taskQueries: TaskQueries) {

    fun handle(event: TaskEvent) {
        when (event) {
            is TaskEvent.TaskCreated -> {
                log.info { "Processing TaskCreated: ${event.taskId}" }
                taskQueries.insertTask(event.userId, TaskToCreateParam(
                    title = event.title,
                    description = event.description,
                    projectId = event.projectId,
                    parentTaskId = event.parentTaskId,
                    assignedTeam = event.assignedTeam,
                    assignedMember = event.assignedMember
                ), event.idempotencyKey)
            }
            is TaskEvent.TaskStatusUpdated -> {
                log.info { "Processing TaskStatusUpdated: ${event.taskId}" }
                taskQueries.updateTaskStatus(
                    event.projectId, event.userId, event.taskId, event.version, event.status
                )
            }
            is TaskEvent.TaskAssigned -> {
                log.info { "Processing TaskAssigned: ${event.taskId}" }
                taskQueries.assignTask(
                    event.projectId, event.userId, event.taskId, event.version,
                    AssignTaskParam(event.teamId, event.teamMemberId)
                )
            }
            is TaskEvent.TaskDeleted -> {
                log.info { "Processing TaskDeleted: ${event.taskId}" }
                taskQueries.deleteTask(event.projectId, event.userId, event.taskId, event.version)
            }
        }
    }
}
