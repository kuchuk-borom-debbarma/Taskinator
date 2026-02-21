package dev.kuku.taskinator.domains.task

import java.time.Instant
import java.util.*

sealed class TaskEvent {
    abstract val eventId: UUID
    abstract val projectId: String
    abstract val timestamp: Instant

    data class TaskCreated(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val taskId: String,
        val userId: String,
        val title: String,
        val description: String?,
        val parentTaskId: String?,
        val assignedTeam: String?,
        val assignedMember: String?,
        /**
         * A unique client-generated or API-generated key used to ensure that a task 
         * is not created twice if the event is re-processed or the request is retried.
         * The database should have a UNIQUE constraint on this column.
         */
        val idempotencyKey: String
    ) : TaskEvent()

    data class TaskStatusUpdated(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val taskId: String,
        val userId: String,
        val status: String,
        val version: Long
    ) : TaskEvent()

    data class TaskAssigned(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val taskId: String,
        val userId: String,
        val teamId: String?,
        val teamMemberId: String?,
        val version: Long
    ) : TaskEvent()

    data class TaskDeleted(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val taskId: String,
        val userId: String,
        val version: Long
    ) : TaskEvent()
}
