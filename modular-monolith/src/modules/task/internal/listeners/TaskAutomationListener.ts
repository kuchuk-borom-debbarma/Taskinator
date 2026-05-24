/**
 * TaskAutomationListener
 *
 * Kafka consumer that runs async (post-commit) automation rules in the background.
 *
 * ─── Supported triggers ────────────────────────────────────────────────────────
 *
 * STATUS_CHANGED
 *   Fires on the task whose status changed.
 *   Condition and action run in the context of that same task.
 *
 * DESCENDANT_STATUS_CHANGED
 *   Fires on every ANCESTOR of the task whose status changed.
 *   The listener walks up task_reachability to find ancestors, then evaluates
 *   the rule condition and action in the context of each ancestor task.
 *   This lets users write parent-level rules like:
 *     "When a descendant changes → if ALL descendants are done → set ME to READY"
 *
 * ─── How to add a new async trigger ──────────────────────────────────────────
 *
 * 1. Add the trigger key to AUTOMATION_TRIGGERS in AutomationRegistry.ts.
 * 2. Add a new private `run<TriggerName>Rules` method here following the same
 *    pattern as runStatusChangedRules / runDescendantStatusChangedRules.
 * 3. Call it from handleTaskUpdated (or a new event handler) as appropriate.
 * 4. Document it in TCA_AUTOMATION.md.
 *
 * See TCA_AUTOMATION.md for the full architecture reference.
 */

import { db } from '../../../../infra/database/index.ts';
import { logger } from '../../../../infra/logger/index.ts';
import eventBus from '../../../../infra/utils/EventBus.ts';
import type { DomainEvent } from '../../../../infra/utils/event-bus';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../../infra/utils/event-bus/constants.ts';
import { taskService } from '../../index.ts';
import type { Task } from '../../TaskService.ts';
import {
    AUTOMATION_ACTIONS,
    AUTOMATION_CONDITIONS,
} from '../AutomationRegistry.ts';

// ─── Payload types ────────────────────────────────────────────────────────────

type TaskUpdatedPayload = {
    taskId: string;
    projectId: string;
    old?: {
        status?: string | null;
        priority?: number | null;
        teamId?: string | null;
        memberId?: string | null;
    };
    new?: {
        status?: string | null;
        priority?: number | null;
        teamId?: string | null;
        memberId?: string | null;
    };
    actorId?: string | null;
};

type TaskCreatedPayload = {
    taskId: string;
    projectId: string;
    actorId?: string | null;
};

// ─── Listener class ───────────────────────────────────────────────────────────

export class TaskAutomationListener {
    async init() {
        logger.info('[Task Automation] Initializing');

        await eventBus.subscribe(
            KAFKA_TOPICS.TASK,
            'task-automation-listener-group',
            {
                [KAFKA_EVENTS.TASK.UPDATED]: this.handleTaskUpdated.bind(this),
                [KAFKA_EVENTS.TASK.CREATED]: this.handleTaskCreated.bind(this),
            },
            { batch: true },
        );
    }

    // ─── Event handlers ───────────────────────────────────────────────────────

    /**
     * Entry point for task.created events.
     * Fires TASK_CREATED rules in the background.
     */
    private async handleTaskCreated(
        events: DomainEvent<TaskCreatedPayload>[],
    ): Promise<void> {
        for (const event of events) {
            const { projectId, taskId } = event.data;
            const actorId = event.data.actorId || 'system:automation';

            await this.runTaskCreatedRules(projectId, taskId, actorId);
        }
    }

    /**
     * Entry point for task.updated events.
     * Checks which fields changed and runs matching rules.
     */
    private async handleTaskUpdated(
        events: DomainEvent<TaskUpdatedPayload>[],
    ): Promise<void> {
        for (const event of events) {
            const { old, new: next, projectId, taskId } = event.data;
            if (!next) continue;

            const actorId = event.data.actorId || 'system:automation';

            const isStatusChanged =
                old?.status !== undefined && old.status !== next.status;
            const isPriorityChanged =
                old?.priority !== undefined && old.priority !== next.priority;
            const isAssigneeChanged =
                (old?.memberId !== undefined &&
                    old.memberId !== next.memberId) ||
                (old?.teamId !== undefined && old.teamId !== next.teamId);

            if (isStatusChanged) {
                const fromStatus = old?.status ?? null;
                const toStatus = next.status ?? null;

                // Run rules that fire on the task itself.
                await this.runStatusChangedRules(
                    projectId,
                    taskId,
                    fromStatus,
                    toStatus,
                    actorId,
                );

                // Run rules that fire on ancestor tasks when a descendant changes.
                await this.runDescendantStatusChangedRules(
                    projectId,
                    taskId,
                    fromStatus,
                    toStatus,
                    actorId,
                );

                // Run rules that fire when a linked incoming task changes status.
                await this.runLinkedIncomingStatusChangedRules(
                    projectId,
                    taskId,
                    fromStatus,
                    toStatus,
                    actorId,
                );

                // Run rules that fire when a linked outgoing task changes status.
                await this.runLinkedOutgoingStatusChangedRules(
                    projectId,
                    taskId,
                    fromStatus,
                    toStatus,
                    actorId,
                );
            }

            if (isPriorityChanged) {
                const fromPriority = old?.priority ?? null;
                const toPriority = next.priority ?? null;

                await this.runPriorityChangedRules(
                    projectId,
                    taskId,
                    fromPriority,
                    toPriority,
                    actorId,
                );
            }

            if (isAssigneeChanged) {
                const fromMemberId = old?.memberId ?? null;
                const toMemberId = next.memberId ?? null;
                const fromTeamId = old?.teamId ?? null;
                const toTeamId = next.teamId ?? null;

                await this.runAssigneeChangedRules(
                    projectId,
                    taskId,
                    fromMemberId,
                    toMemberId,
                    fromTeamId,
                    toTeamId,
                    actorId,
                );
            }
        }
    }

    // ─── STATUS_CHANGED ───────────────────────────────────────────────────────

    /**
     * Runs async rules of type STATUS_CHANGED for the task whose status changed.
     * The rule condition and action both execute in the context of that same task.
     */
    private async runStatusChangedRules(
        projectId: string,
        taskId: string,
        fromStatus: string | null,
        toStatus: string | null,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'STATUS_CHANGED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        const [taskRow] = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .execute();

        if (!taskRow) return;

        const task = this.mapTaskRow(taskRow);

        for (const rule of rules) {
            if (
                !this.matchesTransition(
                    rule.trigger_value,
                    fromStatus,
                    toStatus,
                )
            )
                continue;

            await this.evaluateAndRun(task, rule, actorId);
        }
    }

    // ─── DESCENDANT_STATUS_CHANGED ────────────────────────────────────────────

    /**
     * Runs async rules of type DESCENDANT_STATUS_CHANGED.
     *
     * When task X changes status, this method:
     *   1. Looks up all ancestors of X in the task_reachability closure table.
     *   2. Loads all active DESCENDANT_STATUS_CHANGED rules for the project once.
     *   3. For each ancestor A, evaluates each rule in the context of A.
     *
     * This means the condition (e.g. ALL_DESCENDANTS_IN_STATUS) runs against A,
     * and the action (e.g. SET_STATUS) also updates A — not the changed descendant.
     *
     * Transition matching (from/to filter on trigger_value) is checked against
     * the DESCENDANT's status change, not the ancestor's.
     */
    private async runDescendantStatusChangedRules(
        projectId: string,
        changedTaskId: string,
        fromStatus: string | null,
        toStatus: string | null,
        actorId: string,
    ): Promise<void> {
        // 1. Find all ancestor tasks of the task that just changed.
        const ancestors = await db
            .selectFrom('task_reachability')
            .select('ancestor_task_id')
            .where('descendant_task_id', '=', changedTaskId)
            .where('depth', '>', 0)
            .execute();

        if (ancestors.length === 0) return; // no ancestors → nothing to fire

        // 2. Load all relevant rules for the project once (not per-ancestor).
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'DESCENDANT_STATUS_CHANGED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        // 3. Evaluate each rule in the context of each ancestor.
        for (const { ancestor_task_id } of ancestors) {
            const [ancestorRow] = await db
                .selectFrom('project_task')
                .selectAll()
                .where('id', '=', ancestor_task_id)
                .execute();

            if (!ancestorRow) continue;

            const ancestorTask = this.mapTaskRow(ancestorRow);

            for (const rule of rules) {
                // Transition filter uses the DESCENDANT's status change.
                if (
                    !this.matchesTransition(
                        rule.trigger_value,
                        fromStatus,
                        toStatus,
                    )
                )
                    continue;

                // Condition + action run in the ancestor's context.
                await this.evaluateAndRun(ancestorTask, rule, actorId);
            }
        }
    }

    /**
     * Runs async rules of type LINKED_INCOMING_STATUS_CHANGED.
     *
     * Fires on task Y (the target) when its incoming task X (the source) changes status,
     * where X --[L]--> Y exists.
     */
    private async runLinkedIncomingStatusChangedRules(
        projectId: string,
        changedTaskId: string,
        fromStatus: string | null,
        toStatus: string | null,
        actorId: string,
    ): Promise<void> {
        // Find tasks Y that have an incoming link from the changed task X
        const links = await db
            .selectFrom('task_link')
            .select(['target_task_id', 'label'])
            .where('source_task_id', '=', changedTaskId)
            .execute();

        if (links.length === 0) return;

        // Group by label to minimize DB rule loading queries
        const groupedByLabel = new Map<string, string[]>();
        for (const link of links) {
            const list = groupedByLabel.get(link.label) || [];
            list.push(link.target_task_id);
            groupedByLabel.set(link.label, list);
        }

        for (const [label, targetTaskIds] of groupedByLabel.entries()) {
            const rules = await db
                .selectFrom('task_automation_rule')
                .selectAll()
                .where('fk_project_id', '=', projectId)
                .where('trigger_type', '=', 'LINKED_INCOMING_STATUS_CHANGED')
                .where('trigger_value', '=', label)
                .where('is_active', '=', true)
                .where('is_sync', '=', false)
                .execute();

            if (rules.length === 0) continue;

            for (const targetTaskId of targetTaskIds) {
                const [targetRow] = await db
                    .selectFrom('project_task')
                    .selectAll()
                    .where('id', '=', targetTaskId)
                    .execute();

                if (!targetRow) continue;

                const targetTask = this.mapTaskRow(targetRow);
                for (const rule of rules) {
                    await this.evaluateAndRun(targetTask, rule, actorId);
                }
            }
        }
    }

    /**
     * Runs async rules of type LINKED_OUTGOING_STATUS_CHANGED.
     *
     * Fires on task Y (the source) when its outgoing task X (the target) changes status,
     * where Y --[L]--> X exists.
     */
    private async runLinkedOutgoingStatusChangedRules(
        projectId: string,
        changedTaskId: string,
        fromStatus: string | null,
        toStatus: string | null,
        actorId: string,
    ): Promise<void> {
        // Find tasks Y that have an outgoing link to the changed task X
        const links = await db
            .selectFrom('task_link')
            .select(['source_task_id', 'label'])
            .where('target_task_id', '=', changedTaskId)
            .execute();

        if (links.length === 0) return;

        // Group by label to minimize DB rule loading queries
        const groupedByLabel = new Map<string, string[]>();
        for (const link of links) {
            const list = groupedByLabel.get(link.label) || [];
            list.push(link.source_task_id);
            groupedByLabel.set(link.label, list);
        }

        for (const [label, sourceTaskIds] of groupedByLabel.entries()) {
            const rules = await db
                .selectFrom('task_automation_rule')
                .selectAll()
                .where('fk_project_id', '=', projectId)
                .where('trigger_type', '=', 'LINKED_OUTGOING_STATUS_CHANGED')
                .where('trigger_value', '=', label)
                .where('is_active', '=', true)
                .where('is_sync', '=', false)
                .execute();

            if (rules.length === 0) continue;

            for (const sourceTaskId of sourceTaskIds) {
                const [sourceRow] = await db
                    .selectFrom('project_task')
                    .selectAll()
                    .where('id', '=', sourceTaskId)
                    .execute();

                if (!sourceRow) continue;

                const sourceTask = this.mapTaskRow(sourceRow);
                for (const rule of rules) {
                    await this.evaluateAndRun(sourceTask, rule, actorId);
                }
            }
        }
    }

    // ─── Shared helpers ───────────────────────────────────────────────────────

    /**
     * Checks whether a status transition matches the rule's trigger_value filter.
     *
     * trigger_value is either:
     *   - null/empty   → always matches
     *   - JSON string  → { from?: string, to?: string } — both fields are optional
     *   - plain string → treated as a required `to` value (legacy fallback)
     */
    private matchesTransition(
        triggerValue: string | null,
        fromStatus: string | null,
        toStatus: string | null,
    ): boolean {
        if (!triggerValue) return true;

        try {
            const cfg = JSON.parse(triggerValue);
            if (cfg.from && cfg.from !== fromStatus) return false;
            if (cfg.to && cfg.to !== toStatus) return false;
            return true;
        } catch {
            // Not valid JSON — treat it as a plain `to` status string.
            return triggerValue === toStatus;
        }
    }

    /**
     * Looks up the condition and action functions for a rule, evaluates the
     * condition against the task, and runs the action if it passes.
     *
     * Skips silently if either function is not found in the registry
     * (e.g. a rule was saved with an old key that was later removed).
     */
    private async evaluateAndRun(
        task: Task,
        rule: {
            condition_type: string;
            condition_value: string | null;
            action_type: string;
            action_value: string | null;
        },
        actorId: string,
    ): Promise<void> {
        const conditionFn =
            AUTOMATION_CONDITIONS[
                rule.condition_type as keyof typeof AUTOMATION_CONDITIONS
            ];
        const actionFn =
            AUTOMATION_ACTIONS[
                rule.action_type as keyof typeof AUTOMATION_ACTIONS
            ];

        if (!conditionFn || !actionFn) return; // unknown key — skip gracefully

        const isMet = await conditionFn(task, rule.condition_value);
        if (!isMet) return;

        await actionFn(task, rule.action_value, { actorId, taskService });
    }

    /**
     * Maps a raw project_task database row to the public Task interface.
     * Extracted so both STATUS_CHANGED and DESCENDANT_STATUS_CHANGED handlers
     * share one consistent mapping without duplication.
     */
    private mapTaskRow(row: {
        id: string;
        fk_project_id: string;
        fk_team_id: string | null;
        fk_member_id: string | null;
        title: string;
        description: string;
        status: string;
        version: number;
        created_by: string;
        updated_by: string;
        priority: number | null;
        created_at: Date;
        updated_at: Date;
        direct_incoming_count: number | null;
        direct_outgoing_count: number | null;
        total_incoming_count: number | null;
        total_outgoing_count: number | null;
        incoming_label_counts: unknown;
        outgoing_label_counts: unknown;
    }): Task {
        return {
            id: row.id,
            projectId: row.fk_project_id,
            teamId: row.fk_team_id,
            memberId: row.fk_member_id,
            title: row.title,
            description: row.description,
            status: row.status,
            version: row.version,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            priority: row.priority ?? 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            directIncomingCount: row.direct_incoming_count ?? 0,
            directOutgoingCount: row.direct_outgoing_count ?? 0,
            totalIncomingCount: row.total_incoming_count ?? 0,
            totalOutgoingCount: row.total_outgoing_count ?? 0,
            incomingLabelCounts:
                (row.incoming_label_counts as Record<string, number>) ?? {},
            outgoingLabelCounts:
                (row.outgoing_label_counts as Record<string, number>) ?? {},
        };
    }

    private async runTaskCreatedRules(
        projectId: string,
        taskId: string,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'TASK_CREATED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        const [taskRow] = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .execute();

        if (!taskRow) return;

        const task = this.mapTaskRow(taskRow);

        for (const rule of rules) {
            await this.evaluateAndRun(task, rule, actorId);
        }
    }

    private async runPriorityChangedRules(
        projectId: string,
        taskId: string,
        fromPriority: number | null,
        toPriority: number | null,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'PRIORITY_CHANGED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        const [taskRow] = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .execute();

        if (!taskRow) return;

        const task = this.mapTaskRow(taskRow);

        for (const rule of rules) {
            let matches = true;
            if (rule.trigger_value) {
                try {
                    const cfg = JSON.parse(rule.trigger_value);
                    if (cfg.from && Number(cfg.from) !== fromPriority)
                        matches = false;
                    if (cfg.to && Number(cfg.to) !== toPriority)
                        matches = false;
                } catch (e) {
                    if (Number(rule.trigger_value) !== toPriority)
                        matches = false;
                }
            }
            if (!matches) continue;

            await this.evaluateAndRun(task, rule, actorId);
        }
    }

    private async runAssigneeChangedRules(
        projectId: string,
        taskId: string,
        fromMemberId: string | null,
        toMemberId: string | null,
        fromTeamId: string | null,
        toTeamId: string | null,
        actorId: string,
    ): Promise<void> {
        const rules = await db
            .selectFrom('task_automation_rule')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .where('trigger_type', '=', 'ASSIGNEE_CHANGED')
            .where('is_active', '=', true)
            .where('is_sync', '=', false)
            .execute();

        if (rules.length === 0) return;

        const [taskRow] = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .execute();

        if (!taskRow) return;

        const task = this.mapTaskRow(taskRow);

        for (const rule of rules) {
            await this.evaluateAndRun(task, rule, actorId);
        }
    }
}
