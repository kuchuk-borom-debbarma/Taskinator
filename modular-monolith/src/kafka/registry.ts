import { logger } from '../logger';
import { ProjectAggregated_ChangeUserProjectCount } from '../modules/auth/internal/listeners/ProjectAggregated_ChangeUserProjectCount.ts';
import { ProjectAggregated_ChangeProjectMemberCount } from '../modules/project/internal/listeners/ProjectAggregated_ChangeProjectMemberCount.ts';
import { ProjectAggregated_DeleteProjectMember } from '../modules/project/internal/listeners/ProjectAggregated_DeleteProjectMember.ts';
import { ProjectAggregated_RemoveProjectMember } from '../modules/project/internal/listeners/ProjectAggregated_RemoveProjectMember.ts';
import { TeamAggregated_SyncProjectTeamCountListener } from '../modules/project/internal/listeners/TeamAggregated_SyncProjectTeamCountListener.ts';
import { ProjectAggregated_DeleteProjectTask } from '../modules/task/internal/listeners/ProjectAggregated_DeleteProjectTask.ts';
import { ProjectAggregated_DeleteProjectTaskLink } from '../modules/task/internal/listeners/ProjectAggregated_DeleteProjectTaskLink.ts';
import { ProjectAggregated_UnassignProjectTaskMember } from '../modules/task/internal/listeners/ProjectAggregated_UnassignProjectTaskMember.ts';
import { TeamAggregated_OrphanTeamTasksListener } from '../modules/task/internal/listeners/TeamAggregated_OrphanTeamTasksListener.ts';
import { TeamAggregated_UnassignMemberFromTeamTasksListener } from '../modules/task/internal/listeners/TeamAggregated_UnassignMemberFromTeamTasksListener.ts';
import { ProjectAggregated_DeleteProjectTeam } from '../modules/team/internal/listeners/ProjectAggregated_DeleteProjectTeam.ts';
import { ProjectAggregated_DeleteProjectTeamMember } from '../modules/team/internal/listeners/ProjectAggregated_DeleteProjectTeamMember.ts';
import { ProjectAggregated_RemoveProjectTeamMember } from '../modules/team/internal/listeners/ProjectAggregated_RemoveProjectTeamMember.ts';
import { TeamAggregated_PurgeTeamMembershipsListener } from '../modules/team/internal/listeners/TeamAggregated_PurgeTeamMembershipsListener.ts';
import { TeamAggregated_SyncTeamMemberCountListener } from '../modules/team/internal/listeners/TeamAggregated_SyncTeamMemberCountListener.ts';
import { ProjectEvents_BatchAggregator } from './smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts';
import { TaskEvents_BatchAggregator } from './smart-aggregator-consumer/task/TaskEvents_BatchAggregator.ts';
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
    const p_taskCleanup = new ProjectAggregated_DeleteProjectTask();
    const p_taskLinkCleanup = new ProjectAggregated_DeleteProjectTaskLink();
    const p_teamCleanup = new ProjectAggregated_DeleteProjectTeam();
    const p_teamMemberCleanup = new ProjectAggregated_DeleteProjectTeamMember();
    const p_projectCleanup = new ProjectAggregated_DeleteProjectMember();

    // Team Smart Aggregation Pipeline (Triggers on TEAM/MEMBER events)
    const teamProjectMemberPurgeListener =
        new ProjectAggregated_RemoveProjectTeamMember();

    // Project Member Cascading Pipeline
    const p_memberCountListener =
        new ProjectAggregated_ChangeProjectMemberCount();
    const p_memberRemovalListener = new ProjectAggregated_RemoveProjectMember();
    const p_memberTaskUnassignmentListener =
        new ProjectAggregated_UnassignProjectTaskMember();

    const teamProjectTeamCountListener =
        new TeamAggregated_SyncProjectTeamCountListener();

    const teamMemberCountListener =
        new TeamAggregated_SyncTeamMemberCountListener();

    const teamMembershipPurgeListener =
        new TeamAggregated_PurgeTeamMembershipsListener();

    const teamTaskOrphaningListener =
        new TeamAggregated_OrphanTeamTasksListener();
    const teamTaskUnassignmentListener =
        new TeamAggregated_UnassignMemberFromTeamTasksListener();

    // Task Domain Aggregator
    const taskAggregator = new TaskEvents_BatchAggregator();

    await Promise.all([
        projectAggregator.init(),
        teamAggregator.init(),
        authProjectListener.init(),
        p_taskCleanup.init(),
        p_taskLinkCleanup.init(),
        p_teamCleanup.init(),
        p_teamMemberCleanup.init(),
        p_projectCleanup.init(),
        p_memberCountListener.init(),
        p_memberRemovalListener.init(),
        teamProjectMemberPurgeListener.init(),
        p_memberTaskUnassignmentListener.init(),
        teamProjectTeamCountListener.init(),
        teamMemberCountListener.init(),
        teamMembershipPurgeListener.init(),
        teamTaskOrphaningListener.init(),
        teamTaskUnassignmentListener.init(),
        taskAggregator.init(),
    ]);

    logger.info('[Registry] All domain consumers and listeners initialized');
}
