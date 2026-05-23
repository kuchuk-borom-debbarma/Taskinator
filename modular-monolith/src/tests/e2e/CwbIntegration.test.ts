import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../__tests__/helpers/db.ts';
import { waitFor } from '../../__tests__/helpers/waitFor.ts';
import { db, pool } from '../../database/index.ts';
import type { BehaviorType } from '../../database/tables/BehaviorRule.ts';
import { gqlRequest } from './helpers/request.ts';
import { bootstrapE2E, teardownE2E } from './helpers/server.ts';
import { CREATE_PROJECT } from './project/mutation.ts';
import {
    CREATE_TASK,
    CREATE_TASK_LINK,
    DELETE_TASK,
    UPDATE_TASK,
} from './task/mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('CWB Integration (Guards & Cascades)', () => {
    let owner: { id: string; username: string; email: string };
    let ownerToken: string;
    let projectId: string;

    beforeAll(async () => {
        // [0] Ensure behavior_rule table exists (Apply migration)
        const migrationPath = resolve(
            import.meta.dir,
            '../../../database/migration_cwb_init.sql',
        );
        const migrationSql = readFileSync(migrationPath, 'utf-8');
        await pool.query(migrationSql);

        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();
        // Also cleanup behavior rules since cleanupDb doesn't
        await db.deleteFrom('behavior_rule').execute();

        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'CWB Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;
    });

    async function addBehaviorRule(
        type: BehaviorType,
        options: {
            taskId?: string;
            field?: string;
            operator?: any;
            value?: string;
            message?: string;
        } = {},
    ) {
        await db
            .insertInto('behavior_rule')
            .values({
                fk_project_id: projectId,
                name: `Rule ${type}`,
                behavior_type: type,
                fk_task_id: options.taskId ?? null,
                criteria_field: options.field ?? null,
                criteria_operator: options.operator ?? null,
                criteria_value: options.value ?? null,
                action_message: options.message ?? null,
                is_active: true,
            })
            .execute();
    }

    async function waitForReachability(
        ancestorId: string,
        descendantId: string,
    ) {
        await waitFor(async () => {
            const res = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', ancestorId)
                .where('descendant_task_id', '=', descendantId)
                .executeTakeFirst();
            expect(res).toBeDefined();
        }, 5000);
    }

    describe('Guards (Preventive)', () => {
        it('PARENT_DELETE_GUARD: should block deletion of parent with active subtasks', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Parent Task A' } },
                token: ownerToken,
            });
            const parentId = resA.body.data.task.create.id;

            const resB = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Child Task B' } },
                token: ownerToken,
            });
            const childId = resB.body.data.task.create.id;

            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: parentId,
                        targetTaskId: childId,
                        label: 'subtask',
                    },
                },
                token: ownerToken,
            });

            // Need reachability for the guard check
            await waitForReachability(parentId, childId);

            await addBehaviorRule('PARENT_DELETE_GUARD', {
                message: 'Cannot delete parent with active subtasks',
            });

            const delRes = await gqlRequest({
                query: DELETE_TASK,
                variables: { projectId, taskId: parentId },
                token: ownerToken,
            });

            expect(delRes.body.errors).toBeDefined();
            expect(delRes.body.errors[0].message).toBe(
                'Cannot delete parent with active subtasks',
            );
        });

        it('BLOCKER_SAFETY_GUARD: should block transition to IN_PROGRESS if blockers are incomplete', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Blocker Task A' } },
                token: ownerToken,
            });
            const blockerId = resA.body.data.task.create.id;

            const resB = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Target Task B' } },
                token: ownerToken,
            });
            const targetId = resB.body.data.task.create.id;
            const targetVersion = resB.body.data.task.create.version;

            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: blockerId,
                        targetTaskId: targetId,
                        label: 'blocks',
                    },
                },
                token: ownerToken,
            });

            await waitForReachability(blockerId, targetId);

            await addBehaviorRule('BLOCKER_SAFETY_GUARD', {
                message: 'Incomplete blockers exist',
            });

            const updRes = await gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId: targetId,
                    input: {
                        projectId,
                        version: targetVersion,
                        status: 'IN_PROGRESS',
                    },
                },
                token: ownerToken,
            });

            expect(updRes.body.errors).toBeDefined();
            expect(updRes.body.errors[0].message).toBe(
                'Incomplete blockers exist',
            );
        });

        it('MEMBER_ASSIGNMENT_GUARD: should block member assignment if task has no team', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Freelance Task' } },
                token: ownerToken,
            });
            const taskId = resA.body.data.task.create.id;
            const version = resA.body.data.task.create.version;

            await addBehaviorRule('MEMBER_ASSIGNMENT_GUARD', {
                message: 'Team assignment required',
            });

            const updRes = await gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId,
                    input: { projectId, version, memberId: owner.id },
                },
                token: ownerToken,
            });

            expect(updRes.body.errors).toBeDefined();
            expect(updRes.body.errors[0].message).toBe(
                'Team assignment required',
            );
        });
    });

    describe('Cascades (Reactive)', () => {
        it('BLOCKER_RESOLUTION: should transition target to READY when blocker is DONE', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Blocker Task A' } },
                token: ownerToken,
            });
            const blockerId = resA.body.data.task.create.id;
            const blockerVersion = resA.body.data.task.create.version;

            const resB = await gqlRequest({
                query: CREATE_TASK,
                variables: {
                    input: {
                        projectId,
                        title: 'Target Task B',
                        status: 'TODO',
                    },
                },
                token: ownerToken,
            });
            const targetId = resB.body.data.task.create.id;

            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: blockerId,
                        targetTaskId: targetId,
                        label: 'blocks',
                    },
                },
                token: ownerToken,
            });

            await waitForReachability(blockerId, targetId);

            await db
                .insertInto('behavior_rule')
                .values({
                    fk_project_id: projectId,
                    name: 'Resolve B',
                    behavior_type: 'BLOCKER_RESOLUTION',
                    criteria_field: 'status',
                    criteria_operator: 'EQUALS',
                    criteria_value: 'DONE',
                    action_value: 'READY',
                    is_active: true,
                })
                .execute();

            await gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId: blockerId,
                    input: {
                        projectId,
                        version: blockerVersion,
                        status: 'DONE',
                    },
                },
                token: ownerToken,
            });

            await waitFor(async () => {
                const checkRes = await db
                    .selectFrom('project_task')
                    .select('status')
                    .where('id', '=', targetId)
                    .executeTakeFirst();
                expect(checkRes?.status).toBe('READY');
            }, 5000);
        });

        it('PRIORITY_CASCADE: should propagate priority to descendants', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task A' } },
                token: ownerToken,
            });
            const idA = resA.body.data.task.create.id;
            const verA = resA.body.data.task.create.version;
            const resB = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task B' } },
                token: ownerToken,
            });
            const idB = resB.body.data.task.create.id;
            const resC = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task C' } },
                token: ownerToken,
            });
            const idC = resC.body.data.task.create.id;

            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: idA,
                        targetTaskId: idB,
                        label: 'subtask',
                    },
                },
                token: ownerToken,
            });
            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: idB,
                        targetTaskId: idC,
                        label: 'subtask',
                    },
                },
                token: ownerToken,
            });

            await waitForReachability(idA, idC);

            await db
                .insertInto('behavior_rule')
                .values({
                    fk_project_id: projectId,
                    name: 'Prio Cascade',
                    behavior_type: 'PRIORITY_CASCADE',
                    criteria_field: 'priority',
                    criteria_operator: 'EQUALS',
                    criteria_value: '5',
                    action_value: '5',
                    is_active: true,
                })
                .execute();

            await gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId: idA,
                    input: { projectId, version: verA, priority: 5 },
                },
                token: ownerToken,
            });

            await waitFor(async () => {
                const tasks = await db
                    .selectFrom('project_task')
                    .select(['id', 'priority'])
                    .where('id', 'in', [idB, idC])
                    .execute();
                expect(tasks.length).toBe(2);
                expect(tasks.every((t) => t.priority === 5)).toBe(true);
            }, 5000);
        });

        it('CASCADE_DELETE: should delete descendants recursively', async () => {
            const resA = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task A' } },
                token: ownerToken,
            });
            const idA = resA.body.data.task.create.id;
            const resB = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task B' } },
                token: ownerToken,
            });
            const idB = resB.body.data.task.create.id;
            const resC = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: 'Task C' } },
                token: ownerToken,
            });
            const idC = resC.body.data.task.create.id;

            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: idA,
                        targetTaskId: idB,
                        label: 'subtask',
                    },
                },
                token: ownerToken,
            });
            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: idB,
                        targetTaskId: idC,
                        label: 'subtask',
                    },
                },
                token: ownerToken,
            });

            await waitForReachability(idA, idC);

            await addBehaviorRule('CASCADE_DELETE');

            await gqlRequest({
                query: DELETE_TASK,
                variables: { projectId, taskId: idA },
                token: ownerToken,
            });

            await waitFor(async () => {
                const countRes = await db
                    .selectFrom('project_task')
                    .select(db.fn.countAll().as('count'))
                    .where('id', 'in', [idB, idC])
                    .executeTakeFirst();
                expect(Number(countRes?.count)).toBe(0);
            }, 5000);
        });
    });
});
