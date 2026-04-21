import { ProjectEvents_BatchAggregator } from './consumers/project/ProjectEvents_BatchAggregator.ts';
import { TeamEvents_BatchAggregator } from './consumers/team/TeamEvents_BatchAggregator.ts';
import { ProjectAggregated_AuthUserCountListener } from '../modules/auth/internal/listeners/ProjectAggregated_AuthUserCountListener.ts';
import { ProjectAggregated_TeamCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamCleanupListener.ts';
import { ProjectAggregated_TeamMemberCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamMemberCleanupListener.ts';
import { ProjectAggregated_TaskCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskCleanupListener.ts';
import { ProjectAggregated_TaskLinkCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskLinkCleanupListener.ts';
import { TeamAggregated_ProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_ProjectTeamCountListener.ts';
import { TeamAggregated_TeamMemberCountListener } from '../modules/team/internal/listeners/TeamAggregated_TeamMemberCountListener.ts';
import { TeamAggregated_TeamCleanupListener } from '../modules/task/internal/listeners/TeamAggregated_TeamCleanupListener.ts';
import { TeamAggregated_MemberTaskUnassignmentListener } from '../modules/task/internal/listeners/TeamAggregated_MemberTaskUnassignmentListener.ts';
import { ProjectAggregated_MemberCountListener } from '../modules/project/internal/listeners/ProjectAggregated_MemberCountListener.ts';
import { ProjectAggregated_MemberTeamCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_MemberTeamCleanupListener.ts';
import { ProjectAggregated_MemberTaskUnassignmentListener } from '../modules/task/internal/listeners/ProjectAggregated_MemberTaskUnassignmentListener.ts';
import { TaskEvents_BatchAggregator } from './consumers/task/TaskEvents_BatchAggregator.ts';
import { TaskAggregated_ProjectCountListener } from '../modules/project/internal/listeners/TaskAggregated_ProjectCountListener.ts';
import { TaskAggregated_TeamCountListener } from '../modules/team/internal/listeners/TaskAggregated_TeamCountListener.ts';
import { TaskAggregated_MemberAssignmentListener } from '../modules/internal-notification/internal/listeners/TaskAggregated_MemberAssignmentListener.ts';
import { TaskAggregated_IndividualTaskCleanupListener } from '../modules/task/internal/listeners/TaskAggregated_IndividualTaskCleanupListener.ts';
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
    const authProjectListener = new ProjectAggregated_AuthUserCountListener();

    // Project Deletion Pipeline (Triggers when a PROJECT is deleted)
    const p_teamCleanup = new ProjectAggregated_TeamCleanupListener();
    const p_teamMemberCleanup =
        new ProjectAggregated_TeamMemberCleanupListener();
    const p_taskCleanup = new ProjectAggregated_TaskCleanupListener();
    const p_taskLinkCleanup = new ProjectAggregated_TaskLinkCleanupListener();

    // Team Smart Aggregation Pipeline (Triggers on TEAM/MEMBER events)
    const teamProjectCountListener =
        new TeamAggregated_ProjectTeamCountListener();
    const teamMemberCountListener =
        new TeamAggregated_TeamMemberCountListener();
    const teamCleanupListener = new TeamAggregated_TeamCleanupListener();
    const teamMemberTaskUnassignmentListener =
        new TeamAggregated_MemberTaskUnassignmentListener();

    // Project Member Cascading Pipeline
    const p_memberCountListener = new ProjectAggregated_MemberCountListener();
    const p_memberTeamCleanupListener =
        new ProjectAggregated_MemberTeamCleanupListener();
    const p_memberTaskUnassignmentListener =
        new ProjectAggregated_MemberTaskUnassignmentListener();

    // Task Domain Aggregators & Listeners
    const taskAggregator = new TaskEvents_BatchAggregator();
    const taskProjectCountListener = new TaskAggregated_ProjectCountListener();
    const taskTeamCountListener = new TaskAggregated_TeamCountListener();
    const taskMemberAssignmentListener =
        new TaskAggregated_MemberAssignmentListener();
    const taskIndividualCleanupListener =
        new TaskAggregated_IndividualTaskCleanupListener();

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
