package dev.kuku.taskinator.controllers

import com.netflix.graphql.dgs.DgsComponent
import com.netflix.graphql.dgs.DgsData
import com.netflix.graphql.dgs.DgsDataFetchingEnvironment
import com.netflix.graphql.dgs.InputArgument
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.generated.DgsConstants
import dev.kuku.taskinator.generated.types.PaginationInput
import dev.kuku.taskinator.generated.types.Team
import dev.kuku.taskinator.generated.types.TeamMember

/**
 * Resolves fields of team type
 */
@DgsComponent
class TeamDataFetcher(private val teamService: TeamService) {

    @DgsData(parentType = DgsConstants.TEAM.TYPE_NAME, field = DgsConstants.TEAM.Members)
    fun members(
        dfe: DgsDataFetchingEnvironment,
        @InputArgument(DgsConstants.TEAM.MEMBERS_INPUT_ARGUMENT.Input) input: PaginationInput?
    ): List<TeamMember> {
        val team = dfe.getSource<Team>()!!
        return emptyList()
    }
}
