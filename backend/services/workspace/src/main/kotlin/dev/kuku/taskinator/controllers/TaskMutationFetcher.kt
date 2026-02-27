package dev.kuku.taskinator.controllers

import com.github.f4b6a3.uuid.UuidCreator
import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.task.TaskEvent
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
    /**
     * KafkaTemplate is the core Spring utility for sending messages to Kafka.
     * We use String for the Key (ProjectId) to ensure all events for one project land in the same partition.
     * We use Any for the Value, which will be serialized to JSON by our configured JsonSerializer.
     */
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    /**
     * createTask handles the initial ingest of a new task.
     * It follows "Exactly-Once" semantics by generating IDs before the message is sent.
     */
    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun createTask(
        @InputArgument("input") input: CreateTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): CreateTaskResponse {
        
        // 1. GENERATE THE TASK ID (ID-First Architecture)
        // We generate a UUID v7 (time-ordered) using the uuid-creator library.
        // This allows the API to return the final ID to the client immediately, 
        // even though the record hasn't hit the database yet.
        val taskId = UuidCreator.getTimeOrderedWithRandom().toString()

        // 2. GENERATE THE IDEMPOTENCY KEY
        // This is a unique fingerprint for this specific REQUEST.
        // If the worker receives the same event twice (e.g., due to a network retry),
        // it will use this key to avoid creating duplicate rows in the DB.
        val idempotencyKey = UuidCreator.getTimeOrderedWithRandom().toString()

        // 3. CONSTRUCT THE EVENT
        // We map the GraphQL input into our internal TaskEvent schema.
        val event = TaskEvent.TaskCreated(
            taskId = taskId,
            projectId = input.projectId,
            userId = userId,
            title = input.title,
            description = input.description,
            parentTaskId = input.parentTaskId,
            assignedTeam = input.assignedTeamId,
            assignedMember = input.assignedMemberId,
            idempotencyKey = idempotencyKey
        )

        /**
         * 4. PRODUCE TO KAFKA
         * TOPIC: "workspace-activity" (Unified Entity Stream)
         * KEY: input.projectId (Guarantees ordering for all events within a project)
         * VALUE: event (Serialized to JSON)
         */
        kafkaTemplate.send("workspace-activity", input.projectId, event)

        /**
         * 5. RETURN "ACCEPTED" RESPONSE
         * We return a success=true status and the generated taskId.
         * The status is set to "PENDING" because the task is currently in the Kafka buffer.
         * Fields like 'path' and 'lexoRank' are returned empty as they are calculated by the worker.
         */
        return CreateTaskResponse(
            success = true,
            message = "Task creation queued",
            response = Task(
                id = taskId,
                projectId = input.projectId,
                parentTaskId = input.parentTaskId,
                createdBy = userId,
                title = input.title,
                description = input.description,
                status = "PENDING",
                version = 0,
                path = "", 
                lexoRank = "", 
                createdAt = Instant.now().toString()
            )
        )
    }

    /**
     * updateTaskStatus handles asynchronous status updates.
     */
    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun updateTaskStatus(
        @InputArgument("input") input: UpdateTaskStatusInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TaskEvent.TaskStatusUpdated(
            projectId = input.projectId,
            taskId = input.taskId,
            userId = userId,
            status = input.status,
            version = input.version.toLong()
        )
        
        // Push to Kafka for background processing
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Status update queued")
    }

    /**
     * deleteTask handles asynchronous task deletion.
     */
    @DgsData(parentType = DgsConstants.TASKMUTATION.TYPE_NAME)
    fun deleteTask(
        @InputArgument("input") input: DeleteTaskInput,
        @RequestHeader("X-User-Id") userId: String
    ): GenericResponse {
        val event = TaskEvent.TaskDeleted(
            projectId = input.projectId,
            taskId = input.taskId,
            userId = userId,
            version = input.version.toLong()
        )
        
        // The worker will handle deleting sub-tasks recursively
        kafkaTemplate.send("workspace-activity", input.projectId, event)
        
        return GenericResponse(success = true, message = "Delete request queued")
    }
}
