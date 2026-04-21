import { ProjectEvents_BatchAggregator } from './consumers/project/ProjectEvents_BatchAggregator.ts';
import { TeamEvents_BatchAggregator } from './consumers/team/TeamEvents_BatchAggregator.ts';
import { ProjectAggregated_CountsChanged_SyncUserProjectCountListener } from '../modules/auth/internal/listeners/ProjectAggregated_CountsChanged_SyncUserProjectCountListener.ts';
import { ProjectAggregated_Deleted_DeleteTeamsByProjectIdsListener } from '../modules/team/internal/listeners/ProjectAggregated_Deleted_DeleteTeamsByProjectIdsListener.ts';
import { ProjectAggregated_Deleted_DeleteTeamMembersByProjectIdsListener } from '../modules/team/internal/listeners/ProjectAggregated_Deleted_DeleteTeamMembersByProjectIdsListener.ts';
import { ProjectAggregated_Deleted_DeleteTasksByProjectIdsListener } from '../modules/task/internal/listeners/ProjectAggregated_Deleted_DeleteTasksByProjectIdsListener.ts';
import { ProjectAggregated_Deleted_DeleteTaskLinksByProjectIdsListener } from '../modules/task/internal/listeners/ProjectAggregated_Deleted_DeleteTaskLinksByProjectIdsListener.ts';
import { TeamAggregated_CountsChanged_SyncProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_CountsChanged_SyncProjectTeamCountListener.ts';
import { TeamAggregated_CountsChanged_SyncTeamMemberCountListener } from '../modules/team/internal/listeners/TeamAggregated_CountsChanged_SyncTeamMemberCountListener.ts';
import { TeamAggregated_Deleted_UnassignTasksByTeamIdsListener } from '../modules/task/internal/listeners/TeamAggregated_Deleted_UnassignTasksByTeamIdsListener.ts';
import { TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener } from '../modules/task/internal/listeners/TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener.ts';
import { ProjectAggregated_CountsChanged_SyncProjectMemberCountListener } from '../modules/project/internal/listeners/ProjectAggregated_CountsChanged_SyncProjectMemberCountListener.ts';
import { ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener } from '../modules/team/internal/listeners/ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener.ts';
import { ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener } from '../modules/task/internal/listeners/ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener.ts';
import { TaskEvents_BatchAggregator } from './consumers/task/TaskEvents_BatchAggregator.ts';
import { TaskAggregated_CountsChanged_SyncProjectTaskCountListener } from '../modules/project/internal/listeners/TaskAggregated_CountsChanged_SyncProjectTaskCountListener.ts';
import { TaskAggregated_CountsChanged_SyncTeamTaskCountListener } from '../modules/team/internal/listeners/TaskAggregated_CountsChanged_SyncTeamTaskCountListener.ts';
import { TaskAggregated_MembersChanged_NotifyMemberAssignmentListener } from '../modules/internal-notification/internal/listeners/TaskAggregated_MembersChanged_NotifyMemberAssignmentListener.ts';
import { TaskAggregated_Deleted_PurgeTaskNetworkListener } from '../modules/task/internal/listeners/TaskAggregated_Deleted_PurgeTaskNetworkListener.ts';
import { logger } from '../logger';

/**
 * Event Processing Registry
 *
 * Manages the lifecycle of all domain-specific smart consumers and execution listeners.
 */
export async function startConsumers() {
    logger.info('[Registry] Starting domain event consumers...');

    const projectAggregator = new ProjectEvents_BatchAggregator();
    const teamAggregator = new TeamEvents_BatchAggregator();
    const authProjectListener =
        new ProjectAggregated_CountsChanged_SyncUserProjectCountListener();

    // Project Deletion Pipeline (Triggers when a PROJECT is deleted)
    const p_teamCleanup =
        new ProjectAggregated_Deleted_DeleteTeamsByProjectIdsListener();
    const p_teamMemberCleanup =
        new ProjectAggregated_Deleted_DeleteTeamMembersByProjectIdsListener();
    const p_taskCleanup =
        new ProjectAggregated_Deleted_DeleteTasksByProjectIdsListener();
    const p_taskLinkCleanup =
        new ProjectAggregated_Deleted_DeleteTaskLinksByProjectIdsListener();

    // Team Smart Aggregation Pipeline (Triggers on TEAM/MEMBER events)
    const teamProjectCountListener =
        new TeamAggregated_CountsChanged_SyncProjectTeamCountListener();
    const teamMemberCountListener =
        new TeamAggregated_CountsChanged_SyncTeamMemberCountListener();
    const teamCleanupListener =
        new TeamAggregated_Deleted_UnassignTasksByTeamIdsListener();
    const teamMemberTaskUnassignmentListener =
        new TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener();

    // Project Member Cascading Pipeline
    const p_memberCountListener =
        new ProjectAggregated_CountsChanged_SyncProjectMemberCountListener();
    const p_memberTeamCleanupListener =
        new ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener();
    const p_memberTaskUnassignmentListener =
        new ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener();

    // Task Domain Aggregators & Listeners
    const taskAggregator = new TaskEvents_BatchAggregator();
    const taskProjectCountListener =
        new TaskAggregated_CountsChanged_SyncProjectTaskCountListener();
    const taskTeamCountListener =
        new TaskAggregated_CountsChanged_SyncTeamTaskCountListener();
    const taskMemberAssignmentListener =
        new TaskAggregated_MembersChanged_NotifyMemberAssignmentListener();
    const taskIndividualCleanupListener =
        new TaskAggregated_Deleted_PurgeTaskNetworkListener();

    await Promise.all([
        projectAggregator.init(),
        teamAggregator.init(),
        authProjectListener.init(),
        p_teamCleanup.init(),
        p_teamMemberCleanup.init(),
        p_taskCleanup.init(),
        p_taskLinkCleanup.init(),
        teamProjectCountListener.init(),
        teamMemberCountListener.init(),
        teamCleanupListener.init(),
        teamMemberTaskUnassignmentListener.init(),
        p_memberCountListener.init(),
        p_memberTeamCleanupListener.init(),
        p_memberTaskUnassignmentListener.init(),
        taskAggregator.init(),
        taskProjectCountListener.init(),
        taskTeamCountListener.init(),
        taskMemberAssignmentListener.init(),
        taskIndividualCleanupListener.init(),
    ]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
