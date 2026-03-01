package dev.kuku.taskinator.domains

import dev.kuku.taskinator.TestPostgresConfiguration
import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.project.internal.ProjectConsumer
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.Projects
import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.task.TaskService
import dev.kuku.taskinator.domains.task.internal.ProjectTasksTable
import dev.kuku.taskinator.domains.task.internal.TaskConsumer
import dev.kuku.taskinator.domains.team.TeamEvent
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.internal.ProjectTeamClosure
import dev.kuku.taskinator.domains.team.internal.ProjectTeamMembers
import dev.kuku.taskinator.domains.team.internal.ProjectTeams
import dev.kuku.taskinator.domains.team.internal.TeamConsumer
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
    private val projectConsumer: ProjectConsumer,
    private val teamConsumer: TeamConsumer,
    private val taskConsumer: TaskConsumer,
    private val projectService: ProjectService,
    private val teamService: TeamService,
    private val taskService: TaskService
) {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    private val userId = Uuid.random().toString()

    @BeforeEach
    fun setup() {
        org.mockito.Mockito.`when`(kafkaTemplate.send(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
            .thenReturn(java.util.concurrent.CompletableFuture.completedFuture(null))

        transaction {
            SchemaUtils.drop(ProjectTasksTable, ProjectTeamMembers, ProjectTeamClosure, ProjectTeams, ProjectMembers, Projects)
            SchemaUtils.create(Projects, ProjectMembers, ProjectTeams, ProjectTeamMembers, ProjectTeamClosure, ProjectTasksTable)
        }
    }

    @Test
    fun `should perform synchronous creation and async cascading cleanup`() {
        // GIVEN: Synchronous creation
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

        val ack = mock(Acknowledgment::class.java)

        // WHEN: Project deleted
        val projectDeletedEvent = ProjectEvent.ProjectDeleted(projectId = projectId, userId = userId, version = 0L)
        projectConsumer.consume(listOf(projectDeletedEvent), ack)

        // THEN: Fan-out events triggered
        verify(kafkaTemplate).send(
            org.mockito.ArgumentMatchers.eq("workspace-activity"),
            org.mockito.ArgumentMatchers.eq(projectId),
            org.mockito.ArgumentMatchers.isA(TeamEvent.ProjectTeamsPurgeRequested::class.java)
        )
        verify(kafkaTemplate).send(
            org.mockito.ArgumentMatchers.eq("workspace-activity"),
            org.mockito.ArgumentMatchers.eq(projectId),
            org.mockito.ArgumentMatchers.isA(TaskEvent.ProjectTasksPurgeRequested::class.java)
        )

        // AND: Consumers process purge events
        teamConsumer.consume(listOf(TeamEvent.ProjectTeamsPurgeRequested(projectId = projectId, userId = userId)), ack)
        taskConsumer.consume(listOf(TaskEvent.ProjectTasksPurgeRequested(projectId = projectId, userId = userId)), ack)

        // THEN: Everything deleted
        assertEquals(0, teamService.getTeamsByProject(projectId, userId, 10, 0).size)
        assertEquals(null, taskService.getTaskById(projectId, userId, taskId))
    }

    @Test
    fun `should maintain idempotency when same purge event is processed twice`() {
        val projectId = Uuid.random().toString()
        projectService.createProject(userId, "Idempotent Project", "", projectId)
        val createdTask = taskService.createTask(userId, dev.kuku.taskinator.domains.task.TaskToCreateParam(
            title = "Task", description = null, projectId = projectId, parentTaskId = null, assignedTeam = null, assignedMember = null
        ))
        val taskId = createdTask?.id ?: throw IllegalStateException("Task creation failed")

        val purgeEvent = TaskEvent.ProjectTasksPurgeRequested(projectId = projectId, userId = userId)
        val ack = mock(Acknowledgment::class.java)

        // WHEN: Duplicate events processed
        taskConsumer.consume(listOf(purgeEvent, purgeEvent), ack)

        // THEN: Deleted successfully
        assertEquals(null, taskService.getTaskById(projectId, userId, taskId))
        verify(ack).acknowledge()
    }
}
