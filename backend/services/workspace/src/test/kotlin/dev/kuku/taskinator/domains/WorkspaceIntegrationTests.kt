package dev.kuku.taskinator.domains

import dev.kuku.taskinator.TestPostgresConfiguration
import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.Projects
import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.domains.task.internal.ProjectTasksTable
import dev.kuku.taskinator.domains.team.TeamEvent
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.internal.ProjectTeamClosure
import dev.kuku.taskinator.domains.team.internal.ProjectTeamMembers
import dev.kuku.taskinator.domains.team.internal.ProjectTeams
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.kafka.support.Acknowledgment
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.kafka.core.KafkaTemplate
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid

@OptIn(ExperimentalUuidApi::class)
@SpringBootTest(
    properties = [
        "spring.autoconfigure.exclude=com.netflix.graphql.dgs.springgraphql.autoconfig.DgsSpringGraphQLAutoConfiguration,org.springframework.boot.autoconfigure.graphql.GraphQlAutoConfiguration"
    ]
)
@Import(TestPostgresConfiguration::class)
class WorkspaceIntegrationTests @Autowired constructor(
    private val workspaceConsumer: WorkspaceConsumer,
    private val projectService: ProjectService,
    private val teamService: TeamService,
    private val taskService: TaskService
) {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    private val userId = Uuid.random().toString()

    @BeforeEach
    fun setup() {
        transaction {
            SchemaUtils.drop(ProjectTasksTable, ProjectTeamMembers, ProjectTeamClosure, ProjectTeams, ProjectMembers, Projects)
            SchemaUtils.create(Projects, ProjectMembers, ProjectTeams, ProjectTeamMembers, ProjectTeamClosure, ProjectTasksTable)
        }
    }

    @Test
    fun `should process a unified batch of project, team, and task events`() {
        // GIVEN: A batch of sequential events
        val projectId = Uuid.random().toString()
        val teamId = Uuid.random().toString()
        val taskId = Uuid.random().toString()
        
        val events = listOf(
            ProjectEvent.ProjectCreated(
                projectId = projectId,
                userId = userId,
                name = "Integrated Project",
                description = "Testing the unified stream",
                idempotencyKey = "key-1"
            ),
            TeamEvent.TeamCreated(
                projectId = projectId,
                userId = userId,
                teamId = teamId,
                name = "Integrated Team",
                parentTeamId = null,
                idempotencyKey = "key-2"
            ),
            TaskEvent.TaskCreated(
                projectId = projectId,
                userId = userId,
                taskId = taskId,
                title = "Integrated Task",
                description = null,
                parentTaskId = null,
                assignedTeam = teamId,
                assignedMember = null,
                idempotencyKey = "key-3"
            )
        )

        val ack = mock(Acknowledgment::class.java)

        // WHEN: The consumer processes the batch
        workspaceConsumer.consume(events, ack)

        // THEN: All entities should exist in the database
        val project = projectService.getProjectById(projectId, userId)
        assertNotNull(project)
        assertEquals("Integrated Project", project.name)

        val teams = teamService.getTeamsByProject(projectId, userId, 10, 0)
        assertEquals(1, teams.size)
        assertEquals("Integrated Team", teams[0].name)

        val task = taskService.getTaskById(projectId, userId, taskId)
        assertNotNull(task)
        assertEquals("Integrated Task", task.title)
        assertEquals(teamId, task.assignedTeam)

        // AND: The offset should be acknowledged
        verify(ack).acknowledge()
    }

    @Test
    fun `should maintain idempotency when same event is processed twice`() {
        // GIVEN: The same ProjectCreated event twice
        val projectId = Uuid.random().toString()
        val event = ProjectEvent.ProjectCreated(
            projectId = projectId,
            userId = userId,
            name = "Idempotent Project",
            description = "",
            idempotencyKey = "unique-key-999"
        )
        
        val events = listOf(event, event)
        val ack = mock(Acknowledgment::class.java)

        // WHEN: Consumer processes the duplicates
        workspaceConsumer.consume(events, ack)

        // THEN: Only one project should exist (the second is ignored by ON CONFLICT)
        val project = projectService.getProjectById(projectId, userId)
        assertNotNull(project)
        
        // Offset still acknowledged because the DB handled the conflict gracefully
        verify(ack).acknowledge()
    }
}
