package dev.kuku.taskinator.domains.task

import java.util.Date

data class ProjectTask(
    val id: String,
    val projectId: String,
    val parentTaskId: String?,
    val rootId: String?,
    val path: String,
    val createdBy: String,
    val title: String,
    val description: String?,
    val assignedTeam: String?,
    val assignedTeamMember: String?,
    val status: String,
    val lexoRank: String,
    val version: Long,
    val createdAt: Date,
    val updatedAt: Date?
)
