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
                    
                    projectRepo.deleteProjectMembersByProject(event.projectId)
                    
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.ProjectTeamsPurgeRequested(
                        projectId = event.projectId,
                        userId = event.userId
                    ))
                    
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.ProjectTasksPurgeRequested(
                        projectId = event.projectId,
                        userId = event.userId
                    ))
                }
                is ProjectEvent.ProjectMembersAdded -> {
                    log.info { "ProjectConsumer: Processing ProjectMembersAdded: ${event.projectId}" }
                    projectService.addProjectMembers(event.projectId, event.userId, event.memberIds)
                }
                is ProjectEvent.ProjectMembersRemoved -> {
                    log.info { "ProjectConsumer: Orchestrating member cleanup for project ${event.projectId}" }
                    
                    kafkaTemplate.send(TOPIC, event.projectId, CleanupEvent.MemberCleanupRequested(
                        projectId = event.projectId,
                        userId = event.userId,
                        memberIds = event.memberIds
                    ))
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
