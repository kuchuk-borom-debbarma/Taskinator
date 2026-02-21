package dev.kuku.taskinator.domains.project

import dev.kuku.taskinator.TestPostgresConfiguration
import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.ProjectQueries
import dev.kuku.taskinator.domains.project.internal.Projects
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
import java.util.*
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
class ProjectDomainTests @Autowired constructor(
    private val projectService: ProjectService,
    private val projectRepo: ProjectQueries
) {

    @MockitoBean
    private lateinit var kafkaTemplate: KafkaTemplate<String, Any>

    private val ownerId = Uuid.random().toString()

    @BeforeEach
    fun setup() {
        // Ensure tables exist for testing
        SchemaUtils.create(Projects, ProjectMembers)
    }

    @Test
    fun `should create project successfully`() {
        val name = "Test Project"
        val desc = "Description"
        
        val project = projectService.createProject(ownerId, name, desc)
        
        assertNotNull(project)
        assertEquals(name, project.name)
        assertEquals(ownerId, project.owner)
        assertEquals(desc, project.description)
    }

    @Test
    fun `should throw exception when creating project with duplicate name for same user`() {
        val name = "Duplicate Project"
        projectService.createProject(ownerId, name, "First")
        
        assertThrows<org.springframework.dao.DuplicateKeyException> {
            projectService.createProject(ownerId, name, "Second")
        }
    }

    @Test
    fun `should allow same project name for different users`() {
        val name = "Shared Name"
        val otherOwner = Uuid.random().toString()
        
        val p1 = projectService.createProject(ownerId, name, "First")
        val p2 = projectService.createProject(otherOwner, name, "Second")
        
        assertNotNull(p1)
        assertNotNull(p2)
        assertTrue(p1.id != p2.id)
    }

    @Test
    fun `should add members successfully when called by owner`() {
        val project = projectService.createProject(ownerId, "Member Test", "")!!
        val memberIds = listOf(Uuid.random().toString(), Uuid.random().toString())
        
        projectService.addProjectMembers(project.id, ownerId, memberIds)
        
        val members = projectService.getProjectMembers(project.id, ownerId, ProjectMemberSortKey.ADDED, 0, 10)
        assertEquals(2, members.size)
        assertTrue(members.any { it.memberId == memberIds[0] })
        assertTrue(members.any { it.memberId == memberIds[1] })
    }

    @Test
    fun `should throw exception when adding members as non-owner`() {
        val project = projectService.createProject(ownerId, "Security Test", "")!!
        val hackerId = Uuid.random().toString()
        val victimId = Uuid.random().toString()
        
        assertThrows<IllegalArgumentException> {
            projectService.addProjectMembers(project.id, hackerId, listOf(victimId))
        }
    }

    @Test
    fun `should handle duplicate member additions gracefully (idempotent)`() {
        val project = projectService.createProject(ownerId, "Idempotent Test", "")!!
        val memberId = Uuid.random().toString()
        
        projectService.addProjectMembers(project.id, ownerId, listOf(memberId))
        // Second call with same member - should not crash due to ON CONFLICT DO NOTHING
        projectService.addProjectMembers(project.id, ownerId, listOf(memberId))
        
        val members = projectService.getProjectMembers(project.id, ownerId, ProjectMemberSortKey.ADDED, 0, 10)
        assertEquals(1, members.size)
    }

    @Test
    fun `should update project details successfully`() {
        val project = projectService.createProject(ownerId, "Old Name", "Old Desc")!!
        val update = ProjectFieldsToUpdate(name = "New Name", description = "New Desc", version = 0)
        
        projectService.renameProject(ownerId, project.id, update)
        
        val updated = projectService.getProjectById(project.id, ownerId)
        assertNotNull(updated)
        assertEquals("New Name", updated.name)
        assertEquals("New Desc", updated.description)
    }

    @Test
    fun `should throw exception on update with version mismatch`() {
        val project = projectService.createProject(ownerId, "Concurrency Test", "")!!
        val update = ProjectFieldsToUpdate(name = "New Name", version = 99) // Wrong version
        
        assertThrows<ProjectConcurrencyException> {
            projectService.renameProject(ownerId, project.id, update)
        }
    }

    @Test
    fun `should delete project and its members atomically`() {
        val project = projectService.createProject(ownerId, "Delete Test", "")!!
        val memberId = Uuid.random().toString()
        projectService.addProjectMembers(project.id, ownerId, listOf(memberId))
        
        // Delete the project
        val result = projectService.deleteProject(project.id, ownerId, 0)
        assertTrue(result)
        
        // Verify project is gone
        val foundProject = projectService.getProjectById(project.id, ownerId)
        assertTrue(foundProject == null)
        
        // Verify members are cleaned up from project_members table
        val membersCount = ProjectMembers.selectAll()
            .where { ProjectMembers.projectId eq Uuid.parse(project.id) }
            .count()
        assertEquals(0, membersCount)
    }

    @Test
    fun `should return 404-like error when deleting with wrong owner`() {
        val project = projectService.createProject(ownerId, "Wrong Owner Delete", "")!!
        val hackerId = Uuid.random().toString()
        
        assertThrows<ProjectConcurrencyException> {
            projectService.deleteProject(project.id, hackerId, 0)
        }
    }
}
