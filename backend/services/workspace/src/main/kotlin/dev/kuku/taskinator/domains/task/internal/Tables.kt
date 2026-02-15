package dev.kuku.taskinator.domains.task.internal

import com.github.f4b6a3.uuid.UuidCreator
import org.jetbrains.exposed.v1.core.Column
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.dao.id.IdTable
import org.jetbrains.exposed.v1.javatime.CurrentDateTime
import org.jetbrains.exposed.v1.javatime.datetime
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlin.uuid.toKotlinUuid

 @OptIn(ExperimentalUuidApi::class)
object ProjectTasksTable : IdTable<Uuid>("project_tasks") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() // Shard Key
    val parentTaskId = uuid("fk_parent_task_id").nullable().index() // Direct parent for UI
    val rootId = uuid("fk_root_id").nullable().index() // Top-level Epic/Goal ID for fast tree access
    
    // Materialized Path: root_id/parent_id/task_id for O(1) subtree fetch
    // Example: "018e.../018e.../018e..."
    val path = text("path").index() 

    val createdBy = uuid("fk_created_by")
    val assignedTeam = uuid("fk_assigned_team").nullable().index()
    val assignedTeamMember = uuid("fk_assigned_team_member").nullable().index()

    val title = varchar("title", 155)
    val description = text("description").default("")
    val status = varchar("status", 50).default("NOT STARTED")
    
    // Lexorank for O(1) drag-and-drop reordering
    val lexoRank = varchar("lexo_rank", 255).default("0|hzzzzz:")

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()
    val version = long("version").default(0) // Optimistic Locking

    init {
        // Unique task title per project? Brainstorm says index on (project_id, status, lexo_rank)
        // Let's follow the brainstorm's optimization rule.
        index(isUnique = false, projectId, status, lexoRank)
    }
}