package dev.kuku.taskinator.domains.project

import java.time.Instant
import java.util.*

sealed class ProjectEvent {
    abstract val eventId: UUID
    abstract val projectId: String
    abstract val timestamp: Instant

    data class ProjectCreated(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val name: String,
        val description: String,
        val idempotencyKey: String
    ) : ProjectEvent()

    data class ProjectRenamed(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val name: String?,
        val description: String?,
        val version: Long
    ) : ProjectEvent()

    data class ProjectDeleted(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val version: Long
    ) : ProjectEvent()

    data class ProjectMembersAdded(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val memberIds: List<String>
    ) : ProjectEvent()
    
    data class ProjectMembersRemoved(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val memberIds: List<String>
    ) : ProjectEvent()
}
