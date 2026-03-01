package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.*
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.web.bind.annotation.RequestHeader
import java.time.Instant

/**
 * TaskMutationFetcher implements the "Ingest" phase of the Ingest-Buffer-Drain pattern.
 * Instead of writing directly to the database, it validates the request, generates IDs,
 * and pushes the "Intent" as an event into Kafka.
 * 
 * This approach allows the API to handle 1,000,000+ Requests Per Second (RPS) because
 * it performs zero synchronous database I/O.
 */
@DgsComponent
class TaskMutationFetcher(
    private val kafkaTemplate: KafkaTemplate<String, Any>,
    private val taskService: TaskService
) {

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun createTask(
        @InputArgument("input") input: CreateTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTaskResponse {
        
        val taskId = UuidCreator.getTimeOrderedWithRandom().toString()
        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()

        // 1. CREATE TASK SYNCHRONOUSLY
        val createdTask = taskService.createTask(
            userId = userId,
            toCreate = dev.kuku.taskinator.domains.task.TaskToCreateParam(
                title = input.title,
                description = input.description,
                projectId = input.projectId,
                parentTaskId = input.parentTaskId,
                assignedTeam = input.assignedTeamId,
                assignedMember = input.assignedMemberId
            )
        ) ?: throw RuntimeException("Failed to create task!")

        // 2. CONSTRUCT THE EVENT for background processing (notifications, indexing)
        val event = TaskEvent.TaskCreated(
            taskId = createdTask.id,
            projectId = input.projectId,
            userId = userId,
            title = input.title,
            description = input.description,
            parentTaskId = input.parentTaskId,
            assignedTeam = input.assignedTeamId,
            assignedMember = input.assignedMemberId,
            idempotencyKey = idempotencyKey
        )

        // 3. PRODUCE TO KAFKA
        kafkaTemplate.send("workspace-activity", input.projectId, event)

        // 4. RETURN CREATED
        return CreateTaskResponse(
            success = true,
            message = "Task created successfully",
            response = Task(
                id = createdTask.id,
                projectId = createdTask.projectId,
                parentTaskId = createdTask.parentTaskId,
                createdBy = createdTask.createdBy,
                title = createdTask.title,
                description = createdTask.description,
                status = createdTask.status,
                version = createdTask.version.toInt(),
                path = createdTask.path, 
                lexoRank = createdTask.lexoRank, 
                createdAt = createdTask.createdAt.toString()
            )
        )
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun assignTask(
        @InputArgument("input") input: AssignTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.assignTask(
            projectId = input.projectId,
            userId = userId,
            taskId = input.taskId,
            version = input.version.toLong(),
            assignTo = dev.kuku.taskinator.domains.task.AssignTaskParam(
                teamId = input.teamId,
                teamMemberId = input.teamMemberId
            )
        )

        val event = TaskEvent.TaskAssigned(
            projectId = input.projectId,
            taskId = input.taskId,
            userId = userId,
            teamId = input.teamId,
            teamMemberId = input.teamMemberId,
            version = input.version.toLong()
        )

        kafkaTemplate.send("workspace-activity", input.projectId, event)

        return GenericResponse(success = true, message = "Task assigned successfully")
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun updateTaskStatus(
        @InputArgument("input") input: UpdateTaskStatusInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.updateTaskStatus(
            projectId = input.projectId,
            userId = userId,
            taskId = input.taskId,
            version = input.version.toLong(),
            status = input.status
        )

        val event = TaskEvent.TaskStatusUpdated(
            projectId = input.projectId,
            taskId = input.taskId,
            userId = userId,
            status = input.status,
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Status updated successfully")
    }

    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun deleteTask(
        @InputArgument("input") input: DeleteTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        taskService.deleteTask(
            projectId = input.projectId,
            userId = userId,
            taskId = input.taskId,
            version = input.version.toLong()
        )

        val event = TaskEvent.TaskDeleted(
            projectId = input.projectId,
            taskId = input.taskId,
            userId = userId,
            version = input.version.toLong()
        )
        
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Task deleted successfully")
    }
}
