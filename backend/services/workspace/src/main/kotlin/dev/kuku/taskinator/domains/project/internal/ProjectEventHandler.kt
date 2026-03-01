package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.CleanupEvent
import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

/**
 * ProjectEventHandler is the background worker (Consumer) for the Project domain.
 * 
 * It receives events from the Unified Workspace Stream and orchestrates 
 * high-level domain cleanup.
 */
@Component
class ProjectEventHandler(
    private val projectService: ProjectService,
    private val projectRepo: ProjectQueries,
    private val kafkaTemplate: KafkaTemplate<String, Any>
) {

    private val TOPIC = "workspace-activity"

    /**
     * Routes the incoming ProjectEvent to the appropriate repository method.
     */
    fun handle(event: ProjectEvent) {
        try {
            when (event) {
                is ProjectEvent.ProjectDeleted -> {
                    log.info { "ProjectConsumer: Orchestrating cleanup fan-out for project ${event.projectId}" }
                    
                    // 1. Core Metadata Cleanup (Memberships)
                    projectRepo.deleteProjectMembersByProject(event.projectId)
                    
                    // 2. Fan-out: Trigger async cleanup for Teams and Tasks
                    // We use the same partition key (projectId) to maintain causal order 
                    // within the project's own stream.
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.TeamsRequested(
                        projectId = event.projectId,
                        userId = event.userId
                    ))
                    
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.TasksRequested(
                        projectId = event.projectId,
                        userId = event.userId
                    ))

                    log.info { "ProjectConsumer: Dispatched CleanupEvents for Teams and Tasks" }
                }
                is ProjectEvent.ProjectMembersAdded -> {
                    log.info { "ProjectConsumer: Processing ProjectMembersAdded: ${event.projectId}" }
                    projectService.addProjectMembers(event.projectId, event.userId, event.memberIds)
                }
                is ProjectEvent.ProjectMembersRemoved -> {
                    log.info { "ProjectConsumer: Processing background cleanup for ProjectMembersRemoved: ${event.projectId}" }
                    /**
                     * TODO: CROSS-DOMAIN CLEANUP
                     * 1. Remove these members from all Teams in this project.
                     * 2. Unassign any Tasks assigned to these members in this project.
                     */
                }
                else -> {
                    log.debug { "ProjectConsumer: Skipping background processing for event: ${event::class.simpleName}" }
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in ProjectEventHandler for event: $event" }
            throw e
        }
    }
}
