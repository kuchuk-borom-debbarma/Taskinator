/**
 * ActionDispatcher Integration Tests
 *
 * Tests the full dispatchRules pipeline against a real database:
 *   ConditionEvaluator → TargetResolver → automationBulkUpdateTasks
 *
 * Each test verifies:
 *   1. Which tasks were actually updated in project_task
 *   2. Whether outbox events were written to the correct Kafka lanes
 */
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    it,
    expect,
} from '@jest/globals';
import { sql } from 'kysely';
import { db } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import {
    createUser,
    createProject,
    createTask,
    createChildTask,
} from './helpers/factories.ts';
import { dispatchRules } from '../modules/automation/internal/engine/ActionDispatcher.ts';
import type {
    AutomationPayload,
    DispatchContext,
} from '../modules/automation/internal/engine/DSL.ts';
import type { ProjectTask } from '../modules/task/TaskService.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getTask(taskId: string): Promise<ProjectTask> {
    const result = await sql<ProjectTask>`
        SELECT
            id,
            status,
            title,
            fk_project_id AS "projectId",
            fk_team_id AS "teamId",
            fk_member_id AS "memberId",
            fk_parent_task_id AS "parentTaskId",
            materialized_path AS "materializedPath",
            version
        FROM project_task WHERE id = ${taskId}::uuid
    `.execute(db);
    return result.rows[0]!;
}

async function getOutboxEvents(topic: string): Promise<any[]> {
    const result = await sql<{ id: string; payload: any }>`
        SELECT id, payload FROM outbox_events WHERE kafka_topic = ${topic}
    `.execute(db);
    return result.rows;
}

function makeContext(
    taskId: string,
    projectId: string,
    depth = 0,
): DispatchContext {
    return {
        triggerTaskId: taskId,
        projectId,
        correlationId: 'test-correlation-id',
        depth,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

let ownerId: string;
let projectId: string;

beforeAll(async () => {
    const user = await createUser();
    ownerId = user.id;
    const project = await createProject(ownerId);
    projectId = project.id;
});

beforeEach(async () => {
    await cleanupDb();
    // Re-create owner and project after cleanup
    const user = await createUser();
    ownerId = user.id;
    const project = await createProject(ownerId);
    projectId = project.id;
});

afterAll(async () => {
    await destroyDb();
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('ActionDispatcher — @self target', () => {
    it('updates the triggering task when conditions pass', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        {
                            field: 'status',
                            op: 'CHANGED_TO',
                            value: 'IN_PROGRESS',
                        },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'IN_PROGRESS' },
            makeContext(task.id, projectId),
        );

        const updated = await getTask(task.id);
        expect(updated.status).toBe('REVIEW');
    });

    it('does NOT update task when conditions fail', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'IN_PROGRESS' },
            makeContext(task.id, projectId),
        );

        const unchanged = await getTask(task.id);
        expect(unchanged.status).toBe('TODO');
    });
});

describe('ActionDispatcher — @parent target', () => {
    it('updates the parent task when conditions pass', async () => {
        const parent = await createTask(projectId, ownerId, {
            status: 'TODO',
            title: 'Parent',
        });
        const child = await createChildTask(projectId, ownerId, parent, {
            status: 'TODO',
            title: 'Child',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@parent',
                        params: { status: 'IN_PROGRESS' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(child.id, projectId),
        );

        const updatedParent = await getTask(parent.id);
        expect(updatedParent.status).toBe('IN_PROGRESS');

        const unchangedChild = await getTask(child.id);
        expect(unchangedChild.status).toBe('TODO');
    });

    it('silently skips @parent when the triggering task is a root (no parent)', async () => {
        const rootTask = await createTask(projectId, ownerId, {
            status: 'TODO',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@parent',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await expect(
            dispatchRules(
                payload,
                { status: 'TODO' },
                { status: 'DONE' },
                makeContext(rootTask.id, projectId),
            ),
        ).resolves.not.toThrow();

        const unchanged = await getTask(rootTask.id);
        expect(unchanged.status).toBe('TODO');
    });
});

describe('ActionDispatcher — @children target', () => {
    it('updates all direct children, leaves parent untouched', async () => {
        const parent = await createTask(projectId, ownerId, { status: 'TODO' });
        const child1 = await createChildTask(projectId, ownerId, parent, {
            status: 'TODO',
            title: 'Child 1',
        });
        const child2 = await createChildTask(projectId, ownerId, parent, {
            status: 'TODO',
            title: 'Child 2',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@children',
                        params: { status: 'DONE' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(parent.id, projectId),
        );

        expect((await getTask(child1.id)).status).toBe('DONE');
        expect((await getTask(child2.id)).status).toBe('DONE');
        expect((await getTask(parent.id)).status).toBe('TODO');
    });

    it('is a no-op when the task has no children', async () => {
        const leafTask = await createTask(projectId, ownerId, {
            status: 'TODO',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@children',
                        params: { status: 'DONE' },
                    },
                ],
            },
        ];

        await expect(
            dispatchRules(
                payload,
                { status: 'TODO' },
                { status: 'DONE' },
                makeContext(leafTask.id, projectId),
            ),
        ).resolves.not.toThrow();
    });
});

describe('ActionDispatcher — @descendants target', () => {
    it('updates all nested descendants but not the triggering task', async () => {
        const root = await createTask(projectId, ownerId, {
            status: 'TODO',
            title: 'Root',
        });
        const child = await createChildTask(projectId, ownerId, root, {
            status: 'TODO',
            title: 'Child',
        });
        const grandchild = await createChildTask(projectId, ownerId, child, {
            status: 'TODO',
            title: 'Grandchild',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@descendants',
                        params: { status: 'DONE' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(root.id, projectId),
        );

        expect((await getTask(child.id)).status).toBe('DONE');
        expect((await getTask(grandchild.id)).status).toBe('DONE');
        expect((await getTask(root.id)).status).toBe('TODO');
    });
});

describe('ActionDispatcher — SPECIFIC_TASKS target', () => {
    it('updates only the named tasks regardless of hierarchy', async () => {
        const taskA = await createTask(projectId, ownerId, {
            status: 'TODO',
            title: 'A',
        });
        const taskB = await createTask(projectId, ownerId, {
            status: 'TODO',
            title: 'B',
        });
        const taskC = await createTask(projectId, ownerId, {
            status: 'TODO',
            title: 'C',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: 'SPECIFIC_TASKS',
                        targetIds: [taskA.id, taskC.id],
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(taskB.id, projectId),
        );

        expect((await getTask(taskA.id)).status).toBe('REVIEW');
        expect((await getTask(taskC.id)).status).toBe('REVIEW');
        expect((await getTask(taskB.id)).status).toBe('TODO');
    });
});

describe('ActionDispatcher — Outbox / Propagation', () => {
    it('emits both lanes when shouldPropagate is true (default)', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                        shouldPropagate: true,
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId),
        );

        const displayEvents = await getOutboxEvents('project.task.updated');
        const logicEvents = await getOutboxEvents('automation.trigger.task');

        expect(displayEvents.length).toBeGreaterThanOrEqual(1);
        expect(logicEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('emits Display Lane but suppresses Logic Lane when shouldPropagate is false', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                        shouldPropagate: false,
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId),
        );

        const displayEvents = await getOutboxEvents('project.task.updated');
        const logicEvents = await getOutboxEvents('automation.trigger.task');

        expect(displayEvents.length).toBeGreaterThanOrEqual(1);
        expect(logicEvents.length).toBe(0);
    });

    it('Logic Lane event carries correct correlationId and incremented depth', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                        shouldPropagate: true,
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId, 2),
        );

        const logicEvents = await getOutboxEvents('automation.trigger.task');
        expect(logicEvents.length).toBeGreaterThanOrEqual(1);

        const event = logicEvents[0]!.payload;
        expect(event.correlationId).toBe('test-correlation-id');
        expect(event.depth).toBe(3); // 2 + 1
    });
});

describe('ActionDispatcher — Sequential Rules', () => {
    it('executes multiple passing rules in order', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });
        const sibling = await createTask(projectId, ownerId, {
            status: 'TODO',
        });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: 'SPECIFIC_TASKS',
                        targetIds: [sibling.id],
                        params: { status: 'BLOCKED' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId),
        );

        expect((await getTask(task.id)).status).toBe('REVIEW');
        expect((await getTask(sibling.id)).status).toBe('BLOCKED');
    });

    it('skips a failing rule and continues to the next', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                // This rule FAILS — status didn't change to IN_PROGRESS
                when: {
                    match: 'ALL',
                    conditions: [
                        {
                            field: 'status',
                            op: 'CHANGED_TO',
                            value: 'IN_PROGRESS',
                        },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'BLOCKED' },
                    },
                ],
            },
            {
                // This rule PASSES
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId),
        );

        const updated = await getTask(task.id);
        expect(updated.status).toBe('REVIEW');
    });
});

describe('ActionDispatcher — Cascade Depth Guard', () => {
    it('halts without executing when depth >= MAX_CASCADE_DEPTH (5)', async () => {
        const task = await createTask(projectId, ownerId, { status: 'TODO' });

        const payload: AutomationPayload = [
            {
                when: {
                    match: 'ALL',
                    conditions: [
                        { field: 'status', op: 'CHANGED_TO', value: 'DONE' },
                    ],
                },
                then: [
                    {
                        type: 'UPDATE_TASK',
                        target: '@self',
                        params: { status: 'REVIEW' },
                    },
                ],
            },
        ];

        await dispatchRules(
            payload,
            { status: 'TODO' },
            { status: 'DONE' },
            makeContext(task.id, projectId, 5),
        );

        const unchanged = await getTask(task.id);
        expect(unchanged.status).toBe('TODO');
    });
});
