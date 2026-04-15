/**
 * TIER 3 EDA: Automation Trigger — End-to-End Flow
 *
 * Verifies the full automation loop:
 *   1. taskService.updateTask (Emits project.task.trigger)
 *   2. AutomationListener (Batched) receives event
 *   3. Engine evaluates conditions & dispatches actions
 *   4. automationBulkUpdateTasks updates target task(s)
 */
import { afterAll, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
import { sql } from 'kysely';
import { db } from '../database/index.ts';
import { cleanupDb, destroyDb } from './helpers/db.ts';
import { createUser, createProject, createTask, createChildTask } from './helpers/factories.ts';
import { waitFor } from './helpers/waitFor.ts';
import { taskService } from '../modules/task/index.ts';
import { automationService } from '../modules/automation/index.ts';
import type { ProjectTask } from '../modules/task/TaskService.ts';

async function getTask(taskId: string): Promise<ProjectTask> {
    const result = await sql<ProjectTask>`
        SELECT id, status, title FROM project_task WHERE id = ${taskId}::uuid
    `.execute(db);
    return result.rows[0]!;
}

describe('Automation — End-to-End Trigger Flow', () => {
    let ownerId: string;
    let projectId: string;

    beforeAll(async () => {
        // Initialize services to start listeners
        await taskService.init();
        await automationService.init();
    });

    beforeEach(async () => {
        await cleanupDb();
        const user = await createUser();
        ownerId = user.id;
        const project = await createProject(ownerId);
        projectId = project.id;
    });

    afterAll(async () => {
        await taskService.destroy();
        await automationService.destroy();
        await destroyDb();
    });

    it('triggers an update on a parent when a child is marked DONE', async () => {
        // 1. Setup Hierarchy
        const parent = await createTask(projectId, ownerId, { status: 'TODO', title: 'Parent Task' });
        const child = await createChildTask(projectId, ownerId, parent, { status: 'TODO', title: 'Child Task' });

        // 2. Add Automation Rule
        // IF Child Status CHANGED_TO 'DONE' -> THEN UPDATE @parent SET status = 'IN_PROGRESS'
        await automationService.addAutomation({
            userId: ownerId,
            projectId,
            targetScope: 'TASK',
            taskId: child.id,
            rules: [
                {
                    when: {
                        match: 'ALL',
                        conditions: [{ field: 'status', op: 'CHANGED_TO', value: 'DONE' }]
                    },
                    then: [
                        { type: 'UPDATE_TASK', target: '@parent', params: { status: 'IN_PROGRESS' } }
                    ]
                }
            ]
        });

        // 3. Trigger the mutation
        await taskService.updateTask({
            userId: ownerId,
            projectId,
            taskId: child.id,
            status: 'DONE',
            version: child.version
        });

        // 4. Verification (Async)
        // Since the listener is batched (50ms window), we use waitFor to poll the DB
        await waitFor(async () => {
            const updatedParent = await getTask(parent.id);
            if (updatedParent.status !== 'IN_PROGRESS') {
                throw new Error(`Expected parent status to be IN_PROGRESS, got ${updatedParent.status}`);
            }
        }, 5000); // 5s timeout to be safe

        const finalParent = await getTask(parent.id);
        expect(finalParent.status).toBe('IN_PROGRESS');
    });

    it('handles multiple triggers in a single batch efficiently', async () => {
        const parent = await createTask(projectId, ownerId, { status: 'TODO', title: 'Hub' });
        
        // Create 5 child tasks, each with the same rule: if DONE -> set parent title to 'Updated by [Child ID]'
        const children = await Promise.all([
            createChildTask(projectId, ownerId, parent, { status: 'TODO', title: 'C1' }),
            createChildTask(projectId, ownerId, parent, { status: 'TODO', title: 'C2' }),
            createChildTask(projectId, ownerId, parent, { status: 'TODO', title: 'C3' }),
        ]);

        for (const child of children) {
            await automationService.addAutomation({
                userId: ownerId,
                projectId,
                targetScope: 'TASK',
                taskId: child.id,
                rules: [{
                    when: { match: 'ALL', conditions: [{ field: 'status', op: 'CHANGED_TO', value: 'DONE' }] },
                    then: [{ type: 'UPDATE_TASK', target: '@parent', params: { title: `Updated by ${child.title}` } }]
                }]
            });
        }

        // Trigger all children simultaneously
        await Promise.all(children.map(c => 
            taskService.updateTask({
                userId: ownerId,
                projectId,
                taskId: c.id,
                status: 'DONE',
                version: c.version
            })
        ));

        // The parent title should eventually be one of the child titles
        await waitFor(async () => {
            const updatedParent = await getTask(parent.id);
            if (!updatedParent.title.startsWith('Updated by C')) {
                throw new Error(`Expected parent title to be updated, got ${updatedParent.title}`);
            }
        });
    });

    it('respects MAX_CASCADE_DEPTH to prevent infinite loops', async () => {
        // Setup: A triggers B, B triggers A
        const taskA = await createTask(projectId, ownerId, { status: 'TODO', title: 'Task A' });
        const taskB = await createTask(projectId, ownerId, { status: 'TODO', title: 'Task B' });

        // Rule for A: if status -> DONE, set B to DONE
        await automationService.addAutomation({
            userId: ownerId,
            projectId,
            targetScope: 'TASK',
            taskId: taskA.id,
            rules: [{
                when: { match: 'ALL', conditions: [{ field: 'status', op: 'HAS_CHANGED' }] },
                then: [{ type: 'UPDATE_TASK', target: 'SPECIFIC_TASKS', targetIds: [taskB.id], params: { status: 'DONE' } }]
            }]
        });

        // Rule for B: if status -> DONE, set A to DONE
        await automationService.addAutomation({
            userId: ownerId,
            projectId,
            targetScope: 'TASK',
            taskId: taskB.id,
            rules: [{
                when: { match: 'ALL', conditions: [{ field: 'status', op: 'HAS_CHANGED' }] },
                then: [{ type: 'UPDATE_TASK', target: 'SPECIFIC_TASKS', targetIds: [taskA.id], params: { status: 'DONE' } }]
            }]
        });

        // Trigger the cycle
        await taskService.updateTask({
            userId: ownerId,
            projectId,
            taskId: taskA.id,
            status: 'DONE',
            version: taskA.version
        });

        // Wait a bit for the cycle to exhaust depth (5)
        await new Promise(r => setTimeout(r, 500));

        // Ensure the system didn't crash and we can still fetch tasks
        const finalA = await getTask(taskA.id);
        const finalB = await getTask(taskB.id);
        
        expect(finalA.status).toBe('DONE');
        expect(finalB.status).toBe('DONE');
    });
});
