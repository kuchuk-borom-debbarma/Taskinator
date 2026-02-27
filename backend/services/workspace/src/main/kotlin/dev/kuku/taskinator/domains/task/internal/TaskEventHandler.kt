package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

@Component
class TaskEventHandler(private val taskQueries: TaskQueries) {

    fun handle(event: TaskEvent) {
        try {
            when (event) {
                is TaskEvent.TaskCreated -> {
                    log.info { "Processing background tasks for TaskCreated: ${event.taskId}" }
                    /**
                     * TODO: BACKGROUND TASKS
                     * 1. Notify assigned team/member.
                     * 2. Index task for full-text search.
                     * 3. Update project-level denormalized task counts.
                     */
                }
                is TaskEvent.TaskStatusUpdated -> {
                    log.info { "Processing background tasks for TaskStatusUpdated: ${event.taskId}" }
                    /**
                     * TODO: BACKGROUND TASKS
                     * 1. Notify task creator or project owner of status change.
                     * 2. Trigger downstream automation rules.
                     */
                }
                is TaskEvent.TaskAssigned -> {
                    log.info { "Processing background tasks for TaskAssigned: ${event.taskId}" }
                    /**
                     * TODO: BACKGROUND TASKS
                     * 1. Notify new assignee.
                     * 2. Update team-level task counts.
                     */
                }
                is TaskEvent.TaskDeleted -> {
                    log.info { "Processing background tasks for TaskDeleted: ${event.taskId}" }
                    /**
                     * TODO: BACKGROUND TASKS
                     * 1. Recursively delete sub-tasks (if not handled by DB CASCADE).
                     * 2. Remove task from search index.
                     * 3. Clean up associated file attachments or comments.
                     */
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in TaskEventHandler for event: $event" }
            throw e
        }
    }
}
