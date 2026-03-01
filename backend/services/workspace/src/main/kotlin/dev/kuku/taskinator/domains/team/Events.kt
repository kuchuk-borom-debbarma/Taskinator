package dev.kuku.taskinator.domains.team

import java.time.Instant
import java.util.*

sealed class TeamEvent {
    abstract val eventId: UUID
    abstract val projectId: String
    abstract val timestamp: Instant

    data class TeamCreated(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val teamId: String,
        val name: String,
        val parentTeamId: String?,
        val idempotencyKey: String
    ) : TeamEvent()

    data class TeamRenamed(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val teamId: String,
        val name: String,
        val version: Long
    ) : TeamEvent()

    data class TeamDeleted(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val teamId: String,
        val descendantTeamIds: List<String>, // CAPTURED SCOPE: Used for chunky delete of sub-teams
        val version: Long
    ) : TeamEvent()

    data class TeamMembersAdded(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val teamId: String,
        val memberIds: List<String>
    ) : TeamEvent()

    data class TeamMembersRemoved(
        override val eventId: UUID = UUID.randomUUID(),
        override val projectId: String,
        override val timestamp: Instant = Instant.now(),
        val userId: String,
        val teamId: String,
        val memberIds: List<String>
    ) : TeamEvent()
}
