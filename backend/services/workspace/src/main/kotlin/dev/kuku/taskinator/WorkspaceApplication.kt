package dev.kuku.taskinator

import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class WorkspaceApplication
private val log = KotlinLogging.logger {} // Automatically detects the class name

fun main(args: Array<String>) {
    runApplication<WorkspaceApplication>(*args)
}
