import eventBus, { KAFKA_EVENTS } from '../../../../utils/EventBus.ts';
import {
    getAutomationsByTaskIdsQuery,
    getAutomationsByTeamIdsQuery,
    getAutomationsByProjectIdsQuery,
} from '../AutomationQueries.ts';
import { dispatchRules } from '../engine/ActionDispatcher.ts';
import type { DispatchContext } from '../engine/DSL.ts';

interface TriggerPayload {
    taskId: string;
    projectId: string;
    correlationId: string;
    depth: number;
    oldState: Record<string, any>;
    newState: Record<string, any>;
}

export class AutomationListener {
    private batch: TriggerPayload[] = [];
    private timer: NodeJS.Timeout | null = null;
    private readonly BATCH_SIZE = 100;
    private readonly WINDOW_MS = 50;

    async init() {
        await eventBus.subscribe('automation-engine-group', {
            [KAFKA_EVENTS.AUTOMATION.TRIGGER]: async (data: TriggerPayload) => {
                await this.addToBatch(data);
            },
        });
        console.log('[Automation Module] AutomationListener started (Batched)');
    }

    private async addToBatch(data: TriggerPayload) {
        this.batch.push(data);

        if (this.batch.length >= this.BATCH_SIZE) {
            await this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.WINDOW_MS);
        }
    }

    private async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.batch.length === 0) return;

        const currentBatch = [...this.batch];
        this.batch = [];

        try {
            await this.processBatch(currentBatch);
        } catch (err) {
            console.error(
                '[Automation Module] Error processing automation batch:',
                err,
            );
            if (err instanceof Error) {
                console.error(err.stack);
            }
        }
    }

    private async processBatch(events: TriggerPayload[]) {
        const taskIds = Array.from(new Set(events.map((e) => e.taskId)));
        const projectIds = Array.from(new Set(events.map((e) => e.projectId)));
        const teamIds = Array.from(
            new Set(events.map((e) => e.newState.teamId).filter(Boolean)),
        );

        // 1. Bulk Fetch all potentially relevant rules in exactly 3 DB queries
        const [taskMap, teamMap, projectMap] = await Promise.all([
            getAutomationsByTaskIdsQuery(taskIds),
            getAutomationsByTeamIdsQuery(teamIds),
            getAutomationsByProjectIdsQuery(projectIds),
        ]);

        console.log(
            `[Automation Module] Processing batch of ${events.length} events. Fetched rules for ${taskIds.length} tasks.`,
        );

        // 2. Process events with a concurrency limit of 10
        const CONCURRENCY_LIMIT = 10;
        for (let i = 0; i < events.length; i += CONCURRENCY_LIMIT) {
            const chunk = events.slice(i, i + CONCURRENCY_LIMIT);

            let rulesTriggered = 0;

            const chunkPromises = chunk.map(async (event) => {
                const {
                    taskId,
                    projectId,
                    newState,
                    correlationId,
                    depth,
                    oldState,
                } = event;
                const teamId = newState.teamId;

                const rules = [
                    ...(taskMap.get(taskId) || []),
                    ...(teamId ? teamMap.get(teamId) || [] : []),
                    ...(projectMap.get(projectId) || []),
                ];

                if (rules.length === 0) return;

                // rules Triggered metric: count of rules where at least one action is likely to run
                rulesTriggered += rules.length;

                const payload = rules.flatMap((r) => ({
                    ...r.rules[0], // rules are stored as [{ when, then }] usually but DSL allows array
                    name: r.name, // Pass name down for logging
                }));

                const context: DispatchContext = {
                    triggerTaskId: taskId,
                    projectId,
                    correlationId,
                    depth,
                };

                await dispatchRules(payload, oldState, newState, context);
            });

            const results = await Promise.allSettled(chunkPromises);

            // Log any failures that occurred during processing
            results.forEach((res, idx) => {
                if (res.status === 'rejected') {
                    console.error(
                        `[Automation Module] Event processing failed (Index ${idx}):`,
                        res.reason,
                    );
                }
            });

            if (rulesTriggered > 0) {
                console.log(
                    `[Automation Module] Batch finished. Triggered ${rulesTriggered} rule evaluations.`,
                );
            }
        }
    }

    async stop() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        await this.flush();
    }
}

export const automationListener = new AutomationListener();
