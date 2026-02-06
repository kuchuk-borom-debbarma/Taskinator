package dev.kuku.taskinator.domains.project

import java.util.Date


data class ProjectInfo(
    val id: String,
    val name: String,
    val owner: String,
    val descriptor: String,
    val createdAt: Date,
    val updatedAt: Date
)

data class ProjectMember(val projectId: String,
                         val memberId: String,
                         val createdAt: Date
)

enum class ProjectMemberSortKey{
    ADDED,
    NAME
}