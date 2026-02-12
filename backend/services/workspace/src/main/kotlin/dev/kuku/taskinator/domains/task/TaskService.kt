package dev.kuku.taskinator.domains.task

import org.springframework.stereotype.Service

data class TaskToCreate(
    val name: String,
    val description: String?,
    val parentTaskId: String?,
    val assignedTeam: String?,
    val assignedMember: String?
)

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
    fun createTask(projectId: String, userId: String, toCreate: TaskToCreate)
}