package dev.kuku.taskinator.domains.task

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
    val version: Long
)
