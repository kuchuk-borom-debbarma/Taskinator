package dev.kuku.taskinator.domains

import java.time.Instant
import java.util.*

/**
 * Internal events used to drive the parallel cascading cleanup of workspace entities.
 * These handle full project purges, sub-tree deletions, and relational unassignments.
 */
sealed class CleanupEvent {
    abstract val eventId: UUID
    abstract val projectId: String
    abstract val timestamp: Instant
    abstract val userId: String

    // --- FULL PROJECT PURGES ---

    data class ProjectTeamsPurgeRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String
    ) : CleanupEvent()

    data class ProjectTasksPurgeRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String
    ) : CleanupEvent()

    // --- SUB-TREE PURGES ---

    data class SubTasksPurgeRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String,
        val parentPath: String
    ) : CleanupEvent()

    data class SubTeamsPurgeRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String,
        val teamIds: List<String>
    ) : CleanupEvent()

    // --- RELATIONAL CLEANUPS ---

    data class MemberCleanupRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String,
        val memberIds: List<String>
    ) : CleanupEvent()

    data class TeamTasksUnassignRequested(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        override val userId: String,
        val teamIds: List<String>
    ) : CleanupEvent()
}
