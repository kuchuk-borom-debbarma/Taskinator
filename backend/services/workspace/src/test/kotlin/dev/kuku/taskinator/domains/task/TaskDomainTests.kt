package dev.kuku.taskinator.domains.task

import dev.kuku.taskinator.TestPostgresConfiguration
import dev.kuku.taskinator.domains.project.ProjectService
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.Projects
import dev.kuku.taskinator.domains.team.TeamService
import dev.kuku.taskinator.domains.team.internal.ProjectTeamClosure
import dev.kuku.taskinator.domains.team.internal.ProjectTeamMembers
import dev.kuku.taskinator.domains.team.internal.ProjectTeams
import dev.kuku.taskinator.domains.task.internal.ProjectTasksTable
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
import kotlin.test.assertNotNull
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
class TaskDomainTests @Autowired constructor(
    private val projectService: ProjectService,
    private val teamService: TeamService,
    private val taskService: TaskService
) {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    private val ownerId = Uuid.random().toString()
    private lateinit var projectId: String

    @BeforeEach
    fun setup() {
        // Ensure all required tables exist
        SchemaUtils.create(
            Projects, ProjectMembers, 
            ProjectTeams, ProjectTeamMembers, ProjectTeamClosure,
            ProjectTasksTable
        )
        
        // Create a default project for tests
        val project = projectService.createProject(ownerId, "Test Project", "Desc")!!
        projectId = project.id
    }

    @Test
    fun `should create root task successfully`() {
        val toCreate = TaskToCreateParam(
            title = "Root Task",
            description = "Some description",
            projectId = projectId,
            parentTaskId = null,
            assignedTeam = null,
            assignedMember = null
        )
        
        val task = taskService.createTask(ownerId, toCreate)
        
        assertNotNull(task)
        assertEquals("Root Task", task.title)
        assertEquals(projectId, task.projectId)
        assertEquals(null, task.parentTaskId)
        assertEquals(task.id, task.rootId)
        assertEquals(task.id, task.path)
    }

    @Test
    fun `should create sub-task successfully`() {
        val rootTask = taskService.createTask(ownerId, TaskToCreateParam(
            title = "Root",
            description = null,
            projectId = projectId,
            parentTaskId = null,
            assignedTeam = null,
            assignedMember = null
        ))!!
        
        val subTask = taskService.createTask(ownerId, TaskToCreateParam(
            title = "Sub Task",
            description = null,
            projectId = projectId,
            parentTaskId = rootTask.id,
            assignedTeam = null,
            assignedMember = null
        ))!!
        
        assertNotNull(subTask)
        assertEquals(rootTask.id, subTask.parentTaskId)
        assertEquals(rootTask.id, subTask.rootId)
        assertEquals("${rootTask.id}/${subTask.id}", subTask.path)
    }

    @Test
    fun `should create deep sub-task successfully`() {
        val t1 = taskService.createTask(ownerId, TaskToCreateParam("T1", null, projectId, null, null, null))!!
        val t2 = taskService.createTask(ownerId, TaskToCreateParam("T2", null, projectId, t1.id, null, null))!!
        val t3 = taskService.createTask(ownerId, TaskToCreateParam("T3", null, projectId, t2.id, null, null))!!
        
        assertNotNull(t3)
        assertEquals(t2.id, t3.parentTaskId)
        assertEquals(t1.id, t3.rootId)
        assertEquals("${t1.id}/${t2.id}/${t3.id}", t3.path)
    }

    @Test
    fun `should throw exception when creating task in non-existent project`() {
        val fakeProjectId = Uuid.random().toString()
        val toCreate = TaskToCreateParam("Fail", null, fakeProjectId, null, null, null)
        
        val task = taskService.createTask(ownerId, toCreate)
        assertTrue(task == null)
    }

    @Test
    fun `should throw exception when unauthorized user creates task`() {
        val hackerId = Uuid.random().toString()
        val toCreate = TaskToCreateParam("Fail", null, projectId, null, null, null)
        
        val task = taskService.createTask(hackerId, toCreate)
        assertTrue(task == null)
    }

    @Test
    fun `should update task status successfully by owner`() {
        val task = taskService.createTask(ownerId, TaskToCreateParam("Status Test", null, projectId, null, null, null))!!
        
        taskService.updateTaskStatus(projectId, ownerId, task.id, 0, "IN_PROGRESS")
        
        val updated = taskService.getTaskById(projectId, ownerId, task.id)
        assertNotNull(updated)
        assertEquals("IN_PROGRESS", updated.status)
        assertEquals(1, updated.version)
    }

    @Test
    fun `should assign task to team and then allow team member to update status`() {
        // 1. Create Team
        teamService.createTeam(projectId, ownerId, "Dev Team", null)
        val team = teamService.getTeamsByProject(projectId, ownerId, 1, 0).first()
        
        // 2. Add member to project and team
        val memberId = Uuid.random().toString()
        projectService.addProjectMembers(projectId, ownerId, listOf(memberId))
        teamService.addTeamMembers(projectId, ownerId, team.id, listOf(memberId))
        
        // 3. Create Task and assign to team
        val task = taskService.createTask(ownerId, TaskToCreateParam("Assigned Task", null, projectId, null, null, null))!!
        taskService.assignTask(projectId, ownerId, task.id, 0, AssignTaskParam(team.id, null))
        
        // 4. Team member updates status (should pass)
        taskService.updateTaskStatus(projectId, memberId, task.id, 1, "IN_PROGRESS")
        
        val updated = taskService.getTaskById(projectId, memberId, task.id)
        assertEquals("IN_PROGRESS", updated?.status)
    }

    @Test
    fun `should throw exception when unauthorized member updates status`() {
        val memberId = Uuid.random().toString()
        projectService.addProjectMembers(projectId, ownerId, listOf(memberId))
        
        val task = taskService.createTask(ownerId, TaskToCreateParam("Assigned Task", null, projectId, null, null, null))!!
        // Task not assigned to anyone or any team
        
        assertThrows<IllegalArgumentException> {
            taskService.updateTaskStatus(projectId, memberId, task.id, 0, "DONE")
        }
    }

    @Test
    fun `should handle optimistic locking for status updates`() {
        val task = taskService.createTask(ownerId, TaskToCreateParam("Lock Test", null, projectId, null, null, null))!!
        
        assertThrows<IllegalArgumentException> {
            taskService.updateTaskStatus(projectId, ownerId, task.id, 99, "DONE") // Wrong version
        }
    }

    @Test
    fun `should delete task successfully`() {
        val task = taskService.createTask(ownerId, TaskToCreateParam("Delete Me", null, projectId, null, null, null))!!
        
        taskService.deleteTask(projectId, ownerId, task.id, 0)
        
        val found = taskService.getTaskById(projectId, ownerId, task.id)
        assertTrue(found == null)
    }

    @Test
    fun `should filter unassigned tasks`() {
        // Create 1 assigned and 1 unassigned task
        taskService.createTask(ownerId, TaskToCreateParam("Unassigned", null, projectId, null, null, null))
        
        teamService.createTeam(projectId, ownerId, "Team A", null)
        val team = teamService.getTeamsByProject(projectId, ownerId, 1, 0).first()
        taskService.createTask(ownerId, TaskToCreateParam("Assigned", null, projectId, null, team.id, null))
        
        val unassignedTasks = taskService.getTasks(projectId, ownerId, GetTasksFilterParam(isUnassigned = true))
        assertEquals(1, unassignedTasks.size)
        assertEquals("Unassigned", unassignedTasks.first().title)
        
        val teamTasks = taskService.getTasks(projectId, ownerId, GetTasksFilterParam(assignedTeam = team.id))
        assertEquals(1, teamTasks.size)
        assertEquals("Assigned", teamTasks.first().title)
    }
}
