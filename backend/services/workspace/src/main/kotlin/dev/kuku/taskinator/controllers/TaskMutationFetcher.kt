package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.web.bind.annotation.RequestHeader

@DgsComponent
class TaskMutationFetcher(private val taskService: TaskService) {

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME, field = DgsConstants.TASKMUTATION.CreateTask)
    fun createTask(
        @InputArgument("input") input: CreateTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTaskResponse {
        val result = taskService.createTask(userId, dev.kuku.taskinator.domains.task.TaskToCreateParam(
            title = input.title,
            description = input.description,
            projectId = input.projectId,
            parentTaskId = input.parentTaskId,
            assignedTeam = input.assignedTeamId,
            assignedMember = input.assignedMemberId
        ))
        return if (result != null) {
            CreateTaskResponse(
                success = true,
                message = "Task created",
                response = Task(
                    id = result.id,
                    projectId = result.projectId,
                    parentTaskId = result.parentTaskId,
                    rootId = result.rootId,
                    path = result.path,
                    createdBy = result.createdBy,
                    title = result.title,
                    description = result.description,
                    status = result.status,
                    lexoRank = result.lexoRank,
                    version = result.version.toInt(),
                    createdAt = result.createdAt.toString()
                )
            )
        } else {
            CreateTaskResponse(success = false, message = "Failed to create task")
        }
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME, field = DgsConstants.TASKMUTATION.AssignTask)
    fun assignTask(
        @InputArgument("input") input: AssignTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.assignTask(input.projectId, userId, input.taskId, input.version.toLong(), dev.kuku.taskinator.domains.task.AssignTaskParam(
            teamId = input.teamId,
            teamMemberId = input.teamMemberId
        ))
        return GenericResponse(success = true, message = "Task assigned")
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME, field = DgsConstants.TASKMUTATION.UpdateTaskStatus)
    fun updateTaskStatus(
        @InputArgument("input") input: UpdateTaskStatusInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.updateTaskStatus(input.projectId, userId, input.taskId, input.version.toLong(), input.status)
        return GenericResponse(success = true, message = "Task status updated")
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME, field = DgsConstants.TASKMUTATION.DeleteTask)
    fun deleteTask(
        @InputArgument("input") input: DeleteTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.deleteTask(input.projectId, userId, input.taskId, input.version.toLong())
        return GenericResponse(success = true, message = "Task deleted")
    }
}
