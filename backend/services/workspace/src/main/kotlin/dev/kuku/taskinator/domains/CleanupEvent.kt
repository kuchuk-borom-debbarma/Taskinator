package dev.kuku.taskinator.domains

import java.time.Instant
import java.util.*

/**
 * Internal events used to drive the parallel cascading cleanup of workspace entities.
 * These are dispatched by domain-level consumers to trigger secondary cleanup phases.
 */
sealed class CleanupEvent {
    abstract val eventId: UUID
    abstract val projectId: String
    abstract val timestamp: Instant

    /**
     * Triggered when a project is deleted and its associated teams need to be purged.
     */
    data class TeamsRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String
    ) : CleanupEvent()

    /**
     * Triggered when a project is deleted and its associated tasks need to be purged.
     */
    data class TasksRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String
    ) : CleanupEvent()
}
