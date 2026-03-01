package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val log = KotlinLogging.logger {}

@Service
@Transactional
class TaskServiceImpl(private val taskQueries: TaskQueries) : TaskService {

    private val MAX_LIMIT = 100

    override fun createTask(userId: String, toCreate: TaskToCreateParam): ProjectTask? {
        log.info { "Creating task '${toCreate.title}' in project ${toCreate.projectId} by user $userId" }
        // For the worker, we use the direct DB insert
        // Manual calls via Service (rare) get a random key
        val task = taskQueries.insertTask(userId, toCreate, java.util.UUID.randomUUID().toString(), null)
        if (task != null) {
            log.info { "Task persisted to database: ${task.id}" }
        } else {
            log.warn { "Failed to persist task. Check project permissions and parent task validity." }
        }
        return task
    }

    override fun assignTask(projectId: String, userId: String, taskId: String, version: Long, assignTo: AssignTaskParam) {
        log.info { "Assigning task $taskId to team ${assignTo.teamId} / member ${assignTo.teamMemberId}" }
        val success = taskQueries.assignTask(projectId, userId, taskId, version, assignTo)
        if (!success) {
            throw IllegalArgumentException("Assignment failed. Ensure you have permissions, the task exists, and the version matches.")
        }
        // TODO: Fire TASK_ASSIGNED event
    }

    override fun updateTaskStatus(projectId: String, userId: String, taskId: String, version: Long, status: String) {
        log.info { "Updating status of task $taskId to $status" }
        val success = taskQueries.updateTaskStatus(projectId, userId, taskId, version, status)
        if (!success) {
            throw IllegalArgumentException("Status update failed. Ensure you have permissions, the task exists, and the version matches.")
        }
        // TODO: Fire TASK_STATUS_UPDATED event
    }

    override fun deleteTask(projectId: String, userId: String, taskId: String, version: Long): String {
        log.info { "Deleting task $taskId" }
        
        // CAPTURE SCOPE: Get path before deletion
        val task = taskQueries.findTaskById(projectId, taskId) 
            ?: throw IllegalArgumentException("Task not found.")
            
        val deletedRows = taskQueries.deleteTask(projectId, userId, taskId, version)
        if (deletedRows == 0) {
            throw IllegalArgumentException("Delete failed. Task not found, unauthorized, or version mismatch.")
        }
        
        return task.path
    }

    override fun getTaskById(projectId: String, userId: String, taskId: String): ProjectTask? {
        // Authorization check: User should be part of the project.
        // Queries handle project-level filtering, but we might want a explicit check if needed.
        return taskQueries.findTaskById(projectId, taskId)
    }

    override fun getTasks(projectId: String, userId: String, filter: GetTasksFilterParam): List<ProjectTask> {
        val limit = filter.limit.coerceAtMost(MAX_LIMIT)
        return taskQueries.findTasks(projectId, filter.assignedTeam, filter.isUnassigned, limit, filter.offset)
    }
}
