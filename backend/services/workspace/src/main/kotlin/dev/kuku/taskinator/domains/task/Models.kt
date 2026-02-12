package dev.kuku.taskinator.domains.task

data class ProjectTask(
    val id: String, ///ID of the task
    val projectId: String, ///ID of the project the task belongs to
    val createdBy: String, ///ID of the user who created the project
    val name: String, ///Name of the project
    val description: String?, ///Description of the project
    val assignedToTeam: String?, ///ID of the team the task is assigned to
    val assignedToUser: String?, ///ID of the user of the team to whom the task is assigned to
    val parentTaskId: String?, ///ID of the parent team. This points to the parent task in-case this is a sub-task
    val status: String ///Status of the project
)
