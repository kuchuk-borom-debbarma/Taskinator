package dev.kuku.taskinator.domains.team

import dev.kuku.taskinator.TestPostgresConfiguration
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.Projects
import dev.kuku.taskinator.domains.team.internal.*
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.transaction.annotation.Transactional
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

@OptIn(ExperimentalUuidApi::class)
@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=com.netflix.graphql.dgs.springgraphql.autoconfig.DgsSpringGraphQLAutoConfiguration,org.springframework.boot.autoconfigure.graphql.GraphQlAutoConfiguration"
    ]
)
@Import(TestPostgresConfiguration::class)
@Transactional
class TeamDomainTests @Autowired constructor(
    private val teamService: TeamService,
    private val projectService: ProjectService,
    private val teamRepo: TeamQueries
) {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    private val ownerId = Uuid.random().toString()
    private lateinit var projectId: String

    @BeforeEach
    fun setup() {
        SchemaUtils.create(Projects, ProjectMembers, ProjectTeams, ProjectTeamMembers, ProjectTeamClosure)
        projectId = projectService.createProject(ownerId, "Project 1", "")!!.id
    }

    @Test
    fun `should create root team successfully`() {
        teamService.createTeam(projectId, ownerId, "Engineering", null)
        
        val teams = teamService.getTeamsByProject(projectId, ownerId, 10, 0)
        assertEquals(1, teams.size)
        assertEquals("Engineering", teams[0].name)
        assertTrue(teams[0].parentTeamId == null)
    }

    @Test
    fun `should throw exception for duplicate team name in project`() {
        teamService.createTeam(projectId, ownerId, "Duplicate", null)
        
        assertThrows<TeamNameConflictException> {
            teamService.createTeam(projectId, ownerId, "Duplicate", null)
        }
    }

    @Test
    fun `should create child team and throw error if parent not found`() {
        val nonExistentId = Uuid.random().toString()
        
        assertThrows<IllegalArgumentException> {
            teamService.createTeam(projectId, ownerId, "Child", nonExistentId)
        }
    }

    @Test
    fun `should enforce max hierarchy depth`() {
        // Create a chain of 50 teams
        var parentId: String? = null
        for (i in 0 until 50) {
            teamService.createTeam(projectId, ownerId, "Team $i", parentId)
            val currentTeam = teamService.getTeamsByProject(projectId, ownerId, 100, 0).first { it.name == "Team $i" }
            
            // SIMULATE ASYNC HIERARCHY COMPUTATION
            if (parentId != null) {
                teamRepo.computeTeamHierarchy(projectId, currentTeam.id, parentId)
            }
            parentId = currentTeam.id
        }

        // The 51st team should fail because its parent has ancestors at depth 49, 
        // making the new team have ancestors at depth 50.
        assertThrows<IllegalArgumentException> {
            teamService.createTeam(projectId, ownerId, "Team 51", parentId)
        }
    }

    @Test
    fun `should allow moving teams and prevent cycles`() {
        teamService.createTeam(projectId, ownerId, "Team A", null)
        teamService.createTeam(projectId, ownerId, "Team B", null)
        
        val teams = teamService.getTeamsByProject(projectId, ownerId, 10, 0)
        val teamA = teams.first { it.name == "Team A" }
        val teamB = teams.first { it.name == "Team B" }

        // Move B under A
        teamService.updateTeam(projectId, ownerId, teamB.id, UpdateTeamFields(parentTeamId = teamA.id, version = 0))
        // SIMULATE ASYNC HIERARCHY COMPUTATION
        teamRepo.computeTeamHierarchy(projectId, teamB.id, teamA.id)
        
        val updatedB = teamService.getTeamsByProject(projectId, ownerId, 10, 0).first { it.id == teamB.id }
        assertEquals(teamA.id, updatedB.parentTeamId)

        // Try to move A under B (Cycle!)
        assertThrows<IllegalArgumentException> {
            teamService.updateTeam(projectId, ownerId, teamA.id, UpdateTeamFields(parentTeamId = teamB.id, version = 0))
        }
    }

    @Test
    fun `should add members only if they are project members`() {
        teamService.createTeam(projectId, ownerId, "Team 1", null)
        val teamId = teamService.getTeamsByProject(projectId, ownerId, 1, 0)[0].id
        
        val projectMemberId = Uuid.random().toString()
        projectService.addProjectMembers(projectId, ownerId, listOf(projectMemberId))
        
        val nonProjectMemberId = Uuid.random().toString()
        
        // Add both. Only projectMemberId and ownerId (automatic via UNION in SQL) should succeed.
        teamService.addTeamMembers(projectId, ownerId, teamId, listOf(projectMemberId, nonProjectMemberId, ownerId))
        
        // Check closure/members - Wait, TeamMembers doesn't have a direct count exposed in service yet.
        // We'll check the table directly.
        val count = ProjectTeamMembers.selectAll()
            .where { ProjectTeamMembers.teamId eq Uuid.parse(teamId) }
            .count()
        
        // Should be 2: projectMemberId and ownerId. nonProjectMemberId is ignored.
        assertEquals(2, count)
    }

    @Test
    fun `should delete team and its hierarchy atomically`() {
        teamService.createTeam(projectId, ownerId, "To Delete", null)
        val teamId = teamService.getTeamsByProject(projectId, ownerId, 1, 0)[0].id
        
        val descendants = teamService.deleteTeam(projectId, ownerId, teamId, 0)
        assertTrue(descendants.isEmpty())
        
        val teams = teamService.getTeamsByProject(projectId, ownerId, 10, 0)
        assertTrue(teams.none { it.id == teamId })
        
        // Verify closure table cleanup
        val closureCount = ProjectTeamClosure.selectAll()
            .where { (ProjectTeamClosure.teamId eq Uuid.parse(teamId)) or (ProjectTeamClosure.childId eq Uuid.parse(teamId)) }
            .count()
        assertEquals(0, closureCount)
    }
}
