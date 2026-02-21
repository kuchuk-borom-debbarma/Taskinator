package dev.kuku.taskinator.domains.project.internal

import com.github.f4b6a3.uuid.UuidCreator
import org.jetbrains.exposed.v1.core.Column
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.dao.id.IdTable
import org.jetbrains.exposed.v1.core.greaterEq
import org.jetbrains.exposed.v1.javatime.CurrentDateTime
import org.jetbrains.exposed.v1.javatime.datetime
import kotlin.uuid.ExperimentalUuidApi
import kotlin.uuid.Uuid
import kotlin.uuid.toKotlinUuid

 @OptIn(ExperimentalUuidApi::class)
object Projects : IdTable<Uuid>("projects") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectName = varchar("project_name", 155)
    val description = text("description").default("")
    val ownerId = uuid("fk_owner_id").index() // get projects of user


    // stats denormalization to not have to count.
    // It's okay for them to be little out of sync and get updated slowly. We do not need real time
    val membersCount = integer("members_count").default(0).check { it greaterEq 0 }
    val teamsCount = integer("teams_count").default(0).check { it greaterEq 0 }

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()
    val version = long("version").default(0) // Optimistic Locking for concurrency protection in some cases

    val idempotencyKey = varchar("idempotency_key", 100).uniqueIndex() // Exactly-Once protection

    init {
        // no duplicate project name for a user
        index(isUnique = true, ownerId, projectName)
    }
}

 @OptIn(ExperimentalUuidApi::class)
object ProjectMembers : IdTable<Uuid>("project_members") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() // get members of project
    val ownerId = uuid("fk_owner_id").index() // for sharding by user
    val memberId = uuid("fk_member_id").index() // get projects of member

    // Denormalized member info for high-performance board rendering
    val username = varchar("username", 255)
    val displayName = varchar("display_name", 255)
    val avatarUrl = varchar("avatar_url", 511).nullable()

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()
    init {
        // no duplicate members in a project
        index(isUnique = true, projectId, memberId)
    }
}