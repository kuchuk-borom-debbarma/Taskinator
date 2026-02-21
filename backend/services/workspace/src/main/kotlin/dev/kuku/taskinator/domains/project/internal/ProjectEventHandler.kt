package dev.kuku.taskinator.domains.project.internal

import dev.kuku.taskinator.domains.project.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

@Component
class ProjectEventHandler(
    private val projectService: ProjectService,
    private val projectRepo: ProjectQueries
) {

    fun handle(event: ProjectEvent) {
        when (event) {
            is ProjectEvent.ProjectCreated -> {
                log.info { "Processing ProjectCreated: ${event.projectId}" }
                projectRepo.insertProject(event.projectId, event.name, event.userId, event.description, event.idempotencyKey)
            }
            is ProjectEvent.ProjectRenamed -> {
                log.info { "Processing ProjectRenamed: ${event.projectId}" }
                projectService.renameProject(event.userId, event.projectId, ProjectFieldsToUpdate(
                    name = event.name,
                    description = event.description,
                    version = event.version
                ))
            }
            is ProjectEvent.ProjectDeleted -> {
                log.info { "Processing ProjectDeleted: ${event.projectId}" }
                projectService.deleteProject(event.projectId, event.userId, event.version)
            }
            is ProjectEvent.ProjectMembersAdded -> {
                log.info { "Processing ProjectMembersAdded: ${event.projectId}" }
                projectService.addProjectMembers(event.projectId, event.userId, event.memberIds)
            }
            is ProjectEvent.ProjectMembersRemoved -> {
                log.info { "Processing ProjectMembersRemoved: ${event.projectId}" }
                projectService.removeProjectMembers(event.projectId, event.userId, event.memberIds)
            }
        }
    }
}
