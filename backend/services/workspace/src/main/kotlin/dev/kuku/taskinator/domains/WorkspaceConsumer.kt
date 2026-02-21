package dev.kuku.taskinator.domains

import dev.kuku.taskinator.domains.project.ProjectEvent
import dev.kuku.taskinator.domains.project.internal.ProjectEventHandler
import dev.kuku.taskinator.domains.task.TaskEvent
import dev.kuku.taskinator.domains.task.internal.TaskEventHandler
import dev.kuku.taskinator.domains.team.TeamEvent
import dev.kuku.taskinator.domains.team.internal.TeamEventHandler
import io.github.oshai.kotlinlogging.KotlinLogging
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.kafka.support.Acknowledgment
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

private val log = KotlinLogging.logger {}

/**
 * WorkspaceConsumer is the high-scale Unified Entity Stream worker.
 * 
 * It listens to the 'workspace-activity' topic and delegates events to 
 * domain-specific handlers. By having a single consumer for all workspace 
 * events, we guarantee that causal ordering is maintained at the Kafka 
 * partition level.
 */
@Service
class WorkspaceConsumer(
    private val projectHandler: ProjectEventHandler,
    private val teamHandler: TeamEventHandler,
    private val taskHandler: TaskEventHandler
) {

    /**
     * The unified entry point for all Workspace mutations.
     * Transactional scope ensures that the entire batch is committed atomically.
     */
    @Transactional
    @KafkaListener(topics = ["workspace-activity"])
    fun consume(events: List<Any>, ack: Acknowledgment) {
        log.info { "Unified Consumer received batch of ${events.size} events" }

        try {
            events.forEach { event ->
                when (event) {
                    is ProjectEvent -> projectHandler.handle(event)
                    is TeamEvent -> teamHandler.handle(event)
                    is TaskEvent -> taskHandler.handle(event)
                    else -> log.warn { "Unknown event type encountered in stream: ${event::class.simpleName}" }
                }
            }
            
            // Commit offsets only after all handlers in the batch succeed
            ack.acknowledge()
            log.info { "Successfully processed and committed unified batch" }

        } catch (e: Exception) {
            log.error(e) { "Failed to process Unified batch. Transaction rolled back." }
            // Re-throwing ensures Kafka will retry the batch (backpressure)
            throw e
        }
    }
}
