package dev.kuku.taskinator.domains.task.internal

import dev.kuku.taskinator.domains.task.AssignTaskParam
import dev.kuku.taskinator.domains.task.ProjectTask
import dev.kuku.taskinator.domains.task.TaskToCreateParam

interface TaskQueries {
    fun insertTask(userId: String, toCreate: TaskToCreateParam, idempotencyKey: String, taskId: String? = null): ProjectTask?
    
    fun updateTaskStatus(projectId: String, userId: String, taskId: String, version: Long, status: String): Boolean
    
    fun assignTask(projectId: String, userId: String, taskId: String, version: Long, assignTo: AssignTaskParam): Boolean
    
    fun deleteTask(projectId: String, userId: String, taskId: String, version: Long): Int
    
    fun findTaskById(projectId: String, taskId: String): ProjectTask?
    
    fun findTasks(
        projectId: String, 
        assignedTeam: String?, 
        isUnassigned: Boolean, 
        limit: Int, 
        offset: Int
    ): List<ProjectTask>
}
