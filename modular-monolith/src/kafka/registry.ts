import { ProjectEvents_BatchAggregator } from './consumers/project/ProjectEvents_BatchAggregator.ts';
import { TeamEvents_BatchAggregator } from './consumers/team/TeamEvents_BatchAggregator.ts';
import { ProjectAggregated_AuthUserCountListener } from '../modules/auth/internal/listeners/ProjectAggregated_AuthUserCountListener.ts';
import { ProjectAggregated_TeamCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamCleanupListener.ts';
import { ProjectAggregated_TeamMemberCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_TeamMemberCleanupListener.ts';
import { ProjectAggregated_TaskCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskCleanupListener.ts';
import { ProjectAggregated_TaskLinkCleanupListener } from '../modules/task/internal/listeners/ProjectAggregated_TaskLinkCleanupListener.ts';
import { TeamAggregated_ProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_ProjectTeamCountListener.ts';
import { TeamAggregated_TeamMemberCountListener } from '../modules/team/internal/listeners/TeamAggregated_TeamMemberCountListener.ts';
import { TeamAggregated_TaskUnassignmentListener } from '../modules/task/internal/listeners/TeamAggregated_TaskUnassignmentListener.ts';
import { ProjectAggregated_MemberCountListener } from '../modules/project/internal/listeners/ProjectAggregated_MemberCountListener.ts';
import { ProjectAggregated_MemberTeamCleanupListener } from '../modules/team/internal/listeners/ProjectAggregated_MemberTeamCleanupListener.ts';
import { ProjectAggregated_MemberTaskUnassignmentListener } from '../modules/task/internal/listeners/ProjectAggregated_MemberTaskUnassignmentListener.ts';
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
    const teamTaskOrphanListener =
        new TeamAggregated_TaskUnassignmentListener();

    // Project Member Cascading Pipeline
    const p_memberCountListener = new ProjectAggregated_MemberCountListener();
    const p_memberTeamCleanupListener =
        new ProjectAggregated_MemberTeamCleanupListener();
    const p_memberTaskUnassignmentListener =
        new ProjectAggregated_MemberTaskUnassignmentListener();

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
        teamTaskOrphanListener.init(),
        p_memberCountListener.init(),
        p_memberTeamCleanupListener.init(),
        p_memberTaskUnassignmentListener.init(),
    ]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
