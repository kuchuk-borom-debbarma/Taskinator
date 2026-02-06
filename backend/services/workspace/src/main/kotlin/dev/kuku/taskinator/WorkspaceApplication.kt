package dev.kuku.taskinator

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class WorkspaceApplication

fun main(args: Array<String>) {
    runApplication<WorkspaceApplication>(*args)
}
