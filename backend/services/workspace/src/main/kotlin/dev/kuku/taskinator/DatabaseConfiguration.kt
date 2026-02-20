package dev.kuku.taskinator

import dev.kuku.taskinator.domains.project.internal.ProjectMembers
import dev.kuku.taskinator.domains.project.internal.Projects
import dev.kuku.taskinator.domains.task.internal.ProjectTasksTable
import dev.kuku.taskinator.domains.team.internal.ProjectTeamClosure
import dev.kuku.taskinator.domains.team.internal.ProjectTeamMembers
import dev.kuku.taskinator.domains.team.internal.ProjectTeams
import org.jetbrains.exposed.v1.jdbc.SchemaUtils
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import kotlin.uuid.ExperimentalUuidApi

@Configuration
@OptIn(ExperimentalUuidApi::class)
class DatabaseConfiguration {

    @Bean
    fun initDatabase(): CommandLineRunner {
        return CommandLineRunner {
            transaction {
                SchemaUtils.create(
                    Projects,
                    ProjectMembers,
                    ProjectTeams,
                    ProjectTeamMembers,
                    ProjectTeamClosure,
                    ProjectTasksTable
                )
            }
        }
    }
}
