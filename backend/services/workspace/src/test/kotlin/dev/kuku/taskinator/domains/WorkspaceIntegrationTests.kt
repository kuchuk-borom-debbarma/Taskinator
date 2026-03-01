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
    fun `should perform synchronous creation and async cascading cleanup`() {
        // GIVEN: Synchronous creation of Project, Team, and Task via Services
        val projectId = Uuid.random().toString()
        val teamId = Uuid.random().toString()
        projectService.createProject(userId, "Integrated Project", "Desc", projectId)
        teamService.createTeam(projectId, userId, "Integrated Team", null, teamId = teamId)
        val createdTask = taskService.createTask(userId, dev.kuku.taskinator.domains.task.TaskToCreateParam(
            title = "Integrated Task",
            description = null,
            projectId = projectId,
            parentTaskId = null,
            assignedTeam = teamId,
            assignedMember = null
        ))
        val taskId = createdTask?.id ?: throw IllegalStateException("Task creation failed")

        // Verify they exist
        assertNotNull(projectService.getProjectById(projectId, userId))
        assertEquals(1, teamService.getTeamsByProject(projectId, userId, 10, 0).size)
        assertNotNull(taskService.getTaskById(projectId, userId, taskId))

        val ack = mock(Acknowledgment::class.java)

        // WHEN: The consumer receives the ProjectDeleted event
        val projectDeletedEvent = ProjectEvent.ProjectDeleted(
            projectId = projectId,
            userId = userId,
            version = 0L
        )
        workspaceConsumer.consume(listOf(projectDeletedEvent), ack)

        // THEN: It should have dispatched the fan-out Cleanup events via KafkaTemplate
        verify(kafkaTemplate).send(
            org.mockito.ArgumentMatchers.eq("workspace-activity"),
            org.mockito.ArgumentMatchers.eq(projectId),
            org.mockito.ArgumentMatchers.isA(dev.kuku.taskinator.domains.CleanupEvent.TeamsRequested::class.java)
        )
        verify(kafkaTemplate).send(
            org.mockito.ArgumentMatchers.eq("workspace-activity"),
            org.mockito.ArgumentMatchers.eq(projectId),
            org.mockito.ArgumentMatchers.isA(dev.kuku.taskinator.domains.CleanupEvent.TasksRequested::class.java)
        )

        // AND: When the consumer processes the Cleanup events
        val cleanupTeamsEvent = dev.kuku.taskinator.domains.CleanupEvent.TeamsRequested(
            eventId = UUID.randomUUID(),
            projectId = projectId,
            timestamp = java.time.Instant.now(),
            userId = userId
        )
        val cleanupTasksEvent = dev.kuku.taskinator.domains.CleanupEvent.TasksRequested(
            eventId = UUID.randomUUID(),
            projectId = projectId,
            timestamp = java.time.Instant.now(),
            userId = userId
        )
        
        workspaceConsumer.consume(listOf(cleanupTeamsEvent, cleanupTasksEvent), ack)

        // THEN: The entities should be deleted
        assertEquals(0, teamService.getTeamsByProject(projectId, userId, 10, 0).size)
        assertEquals(null, taskService.getTaskById(projectId, userId, taskId))

        // AND: The offset should be acknowledged
        verify(ack, org.mockito.Mockito.atLeastOnce()).acknowledge()
    }

    @Test
    fun `should maintain idempotency when same cleanup event is processed twice`() {
        // GIVEN: Synchronous creation
        val projectId = Uuid.random().toString()
        projectService.createProject(userId, "Idempotent Project", "", projectId)
        val createdTask = taskService.createTask(userId, dev.kuku.taskinator.domains.task.TaskToCreateParam(
            title = "Task", description = null, projectId = projectId, parentTaskId = null, assignedTeam = null, assignedMember = null
        ))
        val taskId = createdTask?.id ?: throw IllegalStateException("Task creation failed")

        val cleanupEvent = dev.kuku.taskinator.domains.CleanupEvent.TasksRequested(
            eventId = UUID.randomUUID(),
            projectId = projectId,
            timestamp = java.time.Instant.now(),
            userId = userId
        )
        
        val events = listOf(cleanupEvent, cleanupEvent)
        val ack = mock(Acknowledgment::class.java)

        // WHEN: Consumer processes the duplicate cleanup events
        workspaceConsumer.consume(events, ack)

        // THEN: Tasks should be deleted successfully without throwing exceptions
        assertEquals(null, taskService.getTaskById(projectId, userId, taskId))
        
        // Offset still acknowledged
        verify(ack).acknowledge()
    }
}
