package dev.kuku.taskinator.domains.team

import java.util.Date

data class ProjectTeam(
    val id: String,
    val name: String,
    val projectId: String,
    val parentTeamId: String?,
    val createdAt: Date,
    val updatedAt: Date?
)

data class ProjectTeamMember(
    val id: String,
    val memberId: String,
    val teamId: String,
    val createdAt: Date,
    val updatedAt: Date?
)

class TeamNameConflictException(message: String) : RuntimeException(message)
class TeamConcurrencyException(message: String) : RuntimeException(message)
class TeamAlreadyLinkedException(message: String) : RuntimeException(message)