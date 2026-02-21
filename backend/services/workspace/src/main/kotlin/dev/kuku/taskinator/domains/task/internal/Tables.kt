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

/**
 * ProjectTasksTable defines the high-performance schema for the 'project_tasks' table.
 * 
 * OPTIMIZATIONS:
 * 1. UUID Primary Keys: Better than Serial for distributed systems.
 * 2. Materialized Path: Fast subtree fetching without recursive joins.
 * 3. LexoRank: High-performance drag-and-drop reordering.
 * 4. Idempotency Key: Exactly-Once write protection.
 */
 @OptIn(ExperimentalUuidApi::class)
object ProjectTasksTable : IdTable<Uuid>("project_tasks") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() 
    val parentTaskId = uuid("fk_parent_task_id").nullable().index() 
    val rootId = uuid("fk_root_id").nullable().index() 
    
    /**
     * Materialized Path: Stores the full lineage as a string (e.g. "root/parent/child").
     * Allows fetching all subtasks with a single 'path LIKE ...' query.
     */
    val path = text("path").index() 

    val createdBy = uuid("fk_created_by")
    val assignedTeam = uuid("fk_assigned_team").nullable().index()
    val assignedTeamMember = uuid("fk_assigned_team_member").nullable().index()

    val title = varchar("title", 155)
    val description = text("description").default("")
    val status = varchar("status", 50).default("NOT STARTED")
    
    /**
     * LexoRank: Uses string comparison to order tasks. 
     * To move a task between A and B, we just calculate a string that is 
     * alphabetically between A and B.
     */
    val lexoRank = varchar("lexo_rank", 255).default("0|hzzzzz:")

    /**
     * EXACTLY-ONCE PROTECTION:
     * This column ensures that even if Kafka delivers the same event twice, 
     * the database will reject the duplicate write.
     */
    val idempotencyKey = varchar("idempotency_key", 100).uniqueIndex() 

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()
    
    /**
     * OPTIMISTIC LOCKING:
     * Prevents "Lost Updates" where two workers try to update the same task at once.
     */
    val version = long("version").default(0) 

    init {
        // Compound index for fast filtering by project and status while maintaining order
        index(isUnique = false, projectId, status, lexoRank)
    }
}
