package dev.kuku.taskinator.util

object KafkaConstants {
    const val TOPIC_WORKSPACE_ACTIVITY = "workspace-activity"
    
    const val GROUP_ID_PROJECT = "project-service-group"
    const val GROUP_ID_TEAM = "team-service-group"
    const val GROUP_ID_TASK = "task-service-group"
    
    const val BATCH_SIZE_TEAM = 1000
    const val BATCH_SIZE_TASK = 5000
}
