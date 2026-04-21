import { logger } from '../logger';
import { ProjectAggregated_ChangeUserProjectCount } from '../modules/auth/internal/listeners/ProjectAggregated_ChangeUserProjectCount.ts';
import { TaskAggregated_MembersChanged_NotifyMemberAssignmentListener } from '../modules/internal-notification/internal/listeners/TaskAggregated_MembersChanged_NotifyMemberAssignmentListener.ts';
import { ProjectAggregated_ChangeProjectMemberCount } from '../modules/project/internal/listeners/ProjectAggregated_ChangeProjectMemberCount.ts';
import { ProjectAggregated_DeleteProjectMember } from '../modules/project/internal/listeners/ProjectAggregated_DeleteProjectMember.ts';
import { ProjectAggregated_RemoveProjectMember } from '../modules/project/internal/listeners/ProjectAggregated_RemoveProjectMember.ts';
import { TaskAggregated_CountsChanged_SyncProjectTaskCountListener } from '../modules/project/internal/listeners/TaskAggregated_CountsChanged_SyncProjectTaskCountListener.ts';
import { TeamAggregated_CountsChanged_SyncProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_CountsChanged_SyncProjectTeamCountListener.ts';
import { ProjectAggregated_DeleteProjects_TaskCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_DeleteProjects_TaskCleanupListener.ts';
import { ProjectAggregated_RemoveProjectMember_UnassignMemberFromProjectTasksListener } from '../modules/task/internal/listeners/ProjectAggregated_RemoveProjectMember_UnassignMemberFromProjectTasksListener.ts';
import { TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener } from '../modules/task/internal/listeners/TaskAggregated_DirectLinkCountsChanged_SyncTaskCountsListener.ts';
import { TaskAggregated_Reachability_ExpandListener } from '../modules/task/internal/listeners/TaskAggregated_Reachability_ExpandListener.ts';
import { TaskDeleted_TaskCleanupListener } from '../modules/task/internal/listeners/TaskDeleted_TaskCleanupListener.ts';
import { ProjectAggregated_DeleteProjectTeam } from '../modules/team/internal/listeners/ProjectAggregated_DeleteProjectTeam.ts';
import { ProjectAggregated_DeleteProjectTeamMember } from '../modules/team/internal/listeners/ProjectAggregated_DeleteProjectTeamMember.ts';
import { ProjectAggregated_RemoveProjectTeamMember } from '../modules/team/internal/listeners/ProjectAggregated_RemoveProjectTeamMember.ts';
import { TaskAggregated_CountsChanged_SyncTeamTaskCountListener } from '../modules/team/internal/listeners/TaskAggregated_CountsChanged_SyncTeamTaskCountListener.ts';
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
    const authProjectListener = new ProjectAggregated_ChangeUserProjectCount();

    // Decentralized Cleanup Pipeline (Triggers when a PROJECT is deleted)
    const p_taskCleanup =
        new ProjectAggregated_DeleteProjects_TaskCleanupListener();
    const p_teamCleanup = new ProjectAggregated_DeleteProjectTeam();
    const p_teamMemberCleanup = new ProjectAggregated_DeleteProjectTeamMember();
    const p_projectCleanup = new ProjectAggregated_DeleteProjectMember();

    // Team Smart Aggregation Pipeline (Triggers on TEAM/MEMBER events)
    const teamProjectCountListener =
        new TeamAggregated_CountsChanged_SyncProjectTeamCountListener();
    const teamCleanupListener =
        new TeamAggregated_Deleted_UnassignTasksByTeamIdsListener();
    const teamProjectMemberPurgeListener = new ProjectAggregated_RemoveProjectTeamMember();

    // Project Member Cascading Pipeline
    const p_memberCountListener =
        new ProjectAggregated_ChangeProjectMemberCount();
    const p_memberRemovalListener = new ProjectAggregated_RemoveProjectMember();
    const p_memberTaskUnassignmentListener =
        new ProjectAggregated_RemoveProjectMember_UnassignMemberFromProjectTasksListener();

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
        p_teamMemberCleanup.init(),
        teamProjectMemberPurgeListener.init(),
        p_memberTaskUnassignmentListener.init(),
        taskAggregator.init(),
        taskLinkAggregator.init(),
        taskProjectCountListener.init(),
        taskTeamCountListener.init(),
        taskCleanupListener.init(),
        teamProjectMemberPurgeListener.init(),
        logger.info('[Registry] All domain consumers and listeners initialized');
    }
