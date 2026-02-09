package dev.kuku.taskinator.domains.team.internal

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
object ProjectTeams : IdTable<Uuid>("project_teams") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() // Shard Key
    val parentTeamId = uuid("fk_parent_team_id").nullable().index() // Hierarchy direct parent
    val teamName = varchar("team_name", 255)

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()
    val version = long("version").default(0) // Optimistic Locking

    init {
        // unique team name per project
        index(isUnique = true, projectId, teamName)
    }
}

 @OptIn(ExperimentalUuidApi::class)
object ProjectTeamMembers : IdTable<Uuid>("project_team_members") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() // Explicit Shard Key
    val teamId = uuid("fk_team_id").index() // get by teamId
    val memberId = uuid("fk_member_id").index() // get teams of member

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()

    // Denormalized member info
    val username = varchar("username", 255)
    val displayName = varchar("display_name", 255)
    val avatarUrl = varchar("avatar_url", 511).nullable()

    init {
        // no duplicate member per team per project
        index(isUnique = true, projectId, teamId, memberId)
    }
}

 @OptIn(ExperimentalUuidApi::class)
object ProjectTeamClosure : IdTable<Uuid>("project_team_closure") {
    override val id: Column<EntityID<Uuid>> =
        uuid("id").clientDefault { UuidCreator.getTimeOrderedEpoch().toKotlinUuid() }.entityId()
    override val primaryKey = PrimaryKey(id)

    val projectId = uuid("fk_project_id").index() // Shard Key
    val teamId = uuid("fk_team_id").index() // Ancestor team
    val childId = uuid("fk_child_id").index() // Descendant team
    val depth = integer("depth") // 0 for self, 1 for child, 2 for grandchild, etc.

    val createdAt = datetime("created_at").defaultExpression(CurrentDateTime)
    val updatedAt = datetime("updated_at").nullable()

    init {
        // Ensure paths are unique within a project context
        index(isUnique = true, projectId, teamId, childId)
    }
}
