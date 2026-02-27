package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

/**
 * ProjectEventHandler is the background worker for the Project domain.
 * 
 * It receives events from the Unified Workspace Stream and performs the 
 * final database persistence. This decoupling ensures the API stays 
 * responsive (<10ms) even during heavy DB load.
 */
@Component
class ProjectEventHandler(
    private val projectService: ProjectService,
    private val projectRepo: ProjectQueries
) {

    /**
     * Routes the incoming ProjectEvent to the appropriate repository method.
     * 
     * NOTE: We call projectRepo directly for 'Created' events to preserve 
     * the 'idempotencyKey' which is not exposed in the public ProjectService.
     */
    fun handle(event: ProjectEvent) {
        try {
            when (event) {
                is ProjectEvent.ProjectDeleted -> {
                    log.info { "Processing background cleanup for ProjectDeleted: ${event.projectId}" }
                    /**
                     * TODO: BACKGROUND CLEANUP
                     * 1. Delete all Teams associated with this project.
                     * 2. Delete all Tasks associated with this project.
                     * 3. Clean up denormalized values (if any).
                     * 4. Notify other services if necessary.
                     */
                }
                is ProjectEvent.ProjectMembersAdded -> {
                    log.info { "Processing ProjectMembersAdded: ${event.projectId}" }
                    projectService.addProjectMembers(event.projectId, event.userId, event.memberIds)
                }
                is ProjectEvent.ProjectMembersRemoved -> {
                    log.info { "Processing background cleanup for ProjectMembersRemoved: ${event.projectId}, members: ${event.memberIds}" }
                    /**
                     * TODO: BACKGROUND CLEANUP
                     * 1. Remove these members from all Teams in this project.
                     * 2. Unassign any Tasks assigned to these members in this project.
                     * 3. Update denormalized member counts.
                     */
                }
                else -> {
                    // Other events like ProjectCreated/ProjectRenamed are handled synchronously 
                    // and don't require background processing in this service yet.
                    log.debug { "Skipping background processing for event: ${event::class.simpleName}" }
                }
            }
        } catch (e: Exception) {
            log.error(e) { "Error in ProjectEventHandler for event: $event" }
            throw e
        }
    }
}
