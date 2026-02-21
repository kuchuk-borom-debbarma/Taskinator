package dev.kuku.taskinator.domains.team.internal

import dev.kuku.taskinator.domains.team.*
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.stereotype.Component

private val log = KotlinLogging.logger {}

@Component
class TeamEventHandler(
    private val teamService: TeamService,
    private val teamRepo: TeamQueries
) {

    fun handle(event: TeamEvent) {
        when (event) {
            is TeamEvent.TeamCreated -> {
                log.info { "Processing TeamCreated: ${event.teamId}" }
                teamRepo.insertTeam(event.projectId, event.userId, event.teamId, event.name, event.parentTeamId, event.idempotencyKey)
            }
            is TeamEvent.TeamRenamed -> {
                log.info { "Processing TeamRenamed: ${event.teamId}" }
                teamService.updateTeam(event.projectId, event.userId, event.teamId, UpdateTeamFields(
                    teamName = event.name,
                    version = event.version
                ))
            }
            is TeamEvent.TeamDeleted -> {
                log.info { "Processing TeamDeleted: ${event.teamId}" }
                teamService.deleteTeam(event.projectId, event.userId, event.teamId, event.version)
            }
            is TeamEvent.TeamMembersAdded -> {
                log.info { "Processing TeamMembersAdded: ${event.teamId}" }
                teamService.addTeamMembers(event.projectId, event.userId, event.teamId, event.memberIds)
            }
            is TeamEvent.TeamMembersRemoved -> {
                log.info { "Processing TeamMembersRemoved: ${event.teamId}" }
                teamService.removeTeamMembers(event.projectId, event.userId, event.teamId, event.memberIds)
            }
        }
    }
}
