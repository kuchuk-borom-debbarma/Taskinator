import { db } from '../../../database/index.js';
import { ValidationError } from '../../../graphql/errors.ts';
import {
    checkActiveSubtasks,
    checkIncompleteBlockers,
    checkTeamAssignment,
} from './GuardQueries.ts';

/**
 * GuardService implements the Rule evaluation pipeline for Pre-Action Guards.
 * It ensures data integrity by blocking actions that violate Configurable Workspace Behaviors.
 */
export class GuardService {
    /**
     * Evaluates all active guards for a given action and task context.
     * Throws ValidationError if any guard condition is violated.
     */
    async evaluateGuards(
        action: 'update' | 'delete',
        param: {
            projectId: string;
            taskId: string;
            status?: string | null;
            memberId?: string | null;
            teamId?: string | null;
        },
    ): Promise<void> {
        // Fetch all active behavior rules for the project.
        // We fetch all at once to minimize DB roundtrips if multiple guards are active.
        const rules = await db
            .selectFrom('behavior_rule')
            .selectAll()
            .where('fk_project_id', '=', param.projectId as any)
            .where('is_active', '=', true)
            .execute();

        for (const rule of rules) {
            const message =
                rule.action_message ||
                `Action blocked by ${rule.behavior_type}`;

            // 1. PARENT_DELETE_GUARD: Block deletion if active subtasks exist.
            if (
                rule.behavior_type === 'PARENT_DELETE_GUARD' &&
                action === 'delete'
            ) {
                const hasActiveSubtasks = await checkActiveSubtasks(
                    param.taskId,
                );
                if (hasActiveSubtasks) {
                    throw new ValidationError(message);
                }
            }

            // 2. BLOCKER_SAFETY_GUARD: Block transition to IN_PROGRESS if blockers are incomplete.
            if (
                rule.behavior_type === 'BLOCKER_SAFETY_GUARD' &&
                action === 'update' &&
                param.status === 'IN_PROGRESS'
            ) {
                const hasIncompleteBlockers = await checkIncompleteBlockers(
                    param.taskId,
                );
                if (hasIncompleteBlockers) {
                    throw new ValidationError(message);
                }
            }

            // 3. MEMBER_ASSIGNMENT_GUARD: Block member assignment if team context is missing.
            if (
                rule.behavior_type === 'MEMBER_ASSIGNMENT_GUARD' &&
                action === 'update' &&
                param.memberId !== undefined &&
                param.memberId !== null
            ) {
                // Check if the resulting state will have a null team.
                let isTeamNull = false;
                if (param.teamId !== undefined) {
                    // Update includes teamId change.
                    isTeamNull = param.teamId === null;
                } else {
                    // Update does not include teamId, check current state in DB.
                    isTeamNull = await checkTeamAssignment(param.taskId);
                }

                if (isTeamNull) {
                    throw new ValidationError(message);
                }
            }
        }
    }
}

export const guardService = new GuardService();
