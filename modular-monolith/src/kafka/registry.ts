import { logger } from '../logger';
import { ProjectAggregated_CountsChanged_SyncUserProjectCountListener } from '../modules/auth/internal/listeners/ProjectAggregated_CountsChanged_SyncUserProjectCountListener.ts';
import { TaskAggregated_MembersChanged_NotifyMemberAssignmentListener } from '../modules/internal-notification/internal/listeners/TaskAggregated_MembersChanged_NotifyMemberAssignmentListener.ts';
import { ProjectAggregated_CountsChanged_SyncProjectMemberCountListener } from '../modules/project/internal/listeners/ProjectAggregated_CountsChanged_SyncProjectMemberCountListener.ts';
import { ProjectDeleted_ProjectCleanupListener } from '../modules/project/internal/listeners/ProjectDeleted_ProjectCleanupListener.ts';
import { TaskAggregated_CountsChanged_SyncProjectTaskCountListener } from '../modules/project/internal/listeners/TaskAggregated_CountsChanged_SyncProjectTaskCountListener.ts';
import { TeamAggregated_CountsChanged_SyncProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_CountsChanged_SyncProjectTeamCountListener.ts';
import { ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener } from '../modules/task/internal/listeners/ProjectAggregated_MemberRemoved_UnassignMemberFromProjectTasksListener.ts';
import { ProjectDeleted_TaskCleanupListener } from '../modules/task/internal/listeners/ProjectDeleted_TaskCleanupListener.ts';
import { TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener } from '../modules/task/internal/listeners/TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener.ts';
import { TaskAggregated_Reachability_ExpandListener } from '../modules/task/internal/listeners/TaskAggregated_Reachability_ExpandListener.ts';
import { TaskDeleted_TaskCleanupListener } from '../modules/task/internal/listeners/TaskDeleted_TaskCleanupListener.ts';
import { TeamAggregated_Deleted_UnassignTasksByTeamIdsListener } from '../modules/task/internal/listeners/TeamAggregated_Deleted_UnassignTasksByTeamIdsListener.ts';
import { TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener } from '../modules/task/internal/listeners/TeamAggregated_MemberRemoved_UnassignMemberFromTeamTasksListener.ts';
import { ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener } from '../modules/team/internal/listeners/ProjectAggregated_MemberRemoved_RemoveMemberFromAllProjectTeamsListener.ts';
import { ProjectDeleted_TeamCleanupListener } from '../modules/team/internal/listeners/ProjectDeleted_TeamCleanupListener.ts';
import { TaskAggregated_CountsChanged_SyncTeamTaskCountListener } from '../modules/team/internal/listeners/TaskAggregated_CountsChanged_SyncTeamTaskCountListener.ts';
import { TeamAggregated_CountsChanged_SyncTeamMemberCountListener } from '../modules/team/internal/listeners/TeamAggregated_CountsChanged_SyncTeamMemberCountListener.ts';
import { ProjectEvents_BatchAggregator } from './smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts';
import { TaskEvents_BatchAggregator } from './smart-aggregator-consumer/task/TaskEvents_BatchAggregator.ts';
import { TaskLinkEvents_BatchAggregator } from './smart-aggregator-consumer/task/TaskLinkEvents_BatchAggregator.ts';
import { TeamEvents_BatchAggregator } from './smart-aggregator-consumer/team/TeamEvents_BatchAggregator.ts';

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

    // Decentralized Cleanup Pipeline (Triggers when a PROJECT is deleted)
    const p_taskCleanup = new ProjectDeleted_TaskCleanupListener();
    const p_teamCleanup = new ProjectDeleted_TeamCleanupListener();
    const p_projectCleanup = new ProjectDeleted_ProjectCleanupListener();

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
    const taskLinkAggregator = new TaskLinkEvents_BatchAggregator();
    const taskProjectCountListener =
        new TaskAggregated_CountsChanged_SyncProjectTaskCountListener();
    const taskTeamCountListener =
        new TaskAggregated_CountsChanged_SyncTeamTaskCountListener();
    const _taskMemberAssignmentListener =
        new TaskAggregated_MembersChanged_NotifyMemberAssignmentListener();
    const taskCleanupListener = new TaskDeleted_TaskCleanupListener();
    const taskDirectLinkCountsListener =
        new TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener();
    const taskReachabilityExpandListener =
        new TaskAggregated_Reachability_ExpandListener();

    await Promise.all([
        projectAggregator.init(),
        teamAggregator.init(),
        authProjectListener.init(),
        p_taskCleanup.init(),
        p_teamCleanup.init(),
        p_projectCleanup.init(),
        teamProjectCountListener.init(),
        teamMemberCountListener.init(),
        teamCleanupListener.init(),
        teamMemberTaskUnassignmentListener.init(),
        p_memberCountListener.init(),
        p_memberTeamCleanupListener.init(),
        p_memberTaskUnassignmentListener.init(),
        taskAggregator.init(),
        taskLinkAggregator.init(),
        taskProjectCountListener.init(),
        taskTeamCountListener.init(),
        taskCleanupListener.init(),
        taskDirectLinkCountsListener.init(),
        taskReachabilityExpandListener.init(),
    ]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
