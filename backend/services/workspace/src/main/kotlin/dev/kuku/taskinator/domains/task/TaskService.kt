package dev.kuku.taskinator.domains.task

import org.springframework.stereotype.Service

data class TaskToCreateParam(
    val name: String,
    val description: String?,
    val projectId: String,
    val parentTaskId: String?,
    val assignedTeam: String?,
    val assignedMember: String?
)


data class AssignTaskParam(val teamId: String?, val teamMemberId: String?)

data class GetTasksFilterParam()

@Service
/**
 * A task can be created in a project.
 * It can be assigned to a team.
 * The team can assign members to work on that task.
 * If the task needs to be broken down
 * Sub tasks can be created. It is similar to normal task in nature.
 * <br> <br>
 * Updating tasks
 * Tasks can be updated by assigned team, assigned team member.
 * No custom status for now lets keep things simple
 */
interface TaskService {
    /// Create a task or sub-task for a project
    fun createTask(projectId: String, userId: String, toCreate: TaskToCreateParam)

    /// Assign a task to a team and/or team-member
    fun assignTask(projectId: String, userId: String, taskId: String, assignTo: AssignTaskParam)

    /// Update the status of a given task. Any team member can update the task if no member assigned, if member is assigned then only that person can.
    fun updateTaskStatus(projectId: String, userId: String, taskId: String, status: String)

    /// Delete a task. Sub tasks will have to be deleted in async manner too
    fun deleteTask(projectId: String, userId: String, taskId: String)

    /// get the task by Id as long as authorized
    fun getTaskById(projectId: String, userId: String): ProjectTask?

    /// Get tasks based on given filter as long as authorized
    fun getTasks(projectId: String, userId: String, filter: GetTasksFilterParam): List<ProjectTask>
}