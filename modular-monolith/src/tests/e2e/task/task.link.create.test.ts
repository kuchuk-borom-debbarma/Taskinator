import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, CREATE_TASK_LINK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Link Creation E2E', () => {
    let owner: any;
    let member: any;
    let stranger: any;
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let taskAId: string;
    let taskBId: string;
    let taskCId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        // [1] Setup Users
        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        member = await db
            .insertInto('users')
            .values({
                email: 'member@test.com',
                username: 'member',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        stranger = await db
            .insertInto('users')
            .values({
                email: 'stranger@test.com',
                username: 'stranger',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );
        memberToken = jwt.sign(
            { id: member.id, email: member.email, username: member.username },
            JWT_SECRET,
        );
        strangerToken = jwt.sign(
            {
                id: stranger.id,
                email: stranger.email,
                username: stranger.username,
            },
            JWT_SECRET,
        );

        // [2] Create Project
        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Engineering Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // [3] Add 'member' to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();

        // [4] Create 3 Tasks for linking
        // Task A -> Task B -> Task C
        const resA = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task A' } },
            token: ownerToken,
        });
        taskAId = resA.body.data.task.create.id;

        const resB = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task B' } },
            token: ownerToken,
        });
        taskBId = resB.body.data.task.create.id;

        const resC = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task C' } },
            token: ownerToken,
        });
        taskCId = resC.body.data.task.create.id;
    });

    it('should allow project owner to create a link and propagate reachability/counters', async () => {
        // [1] Create Link: A -> B
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'blocks',
                },
            },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        const link = res.body.data.task.createLink;
        expect(link.source.id).toBe(taskAId);
        expect(link.target.id).toBe(taskBId);
        expect(link.label).toBe('blocks');

        // [2] Verify Task Link in DB
        const linkDb = await db
            .selectFrom('task_link')
            .where('id', '=', link.id)
            .selectAll()
            .executeTakeFirst();
        expect(linkDb).toBeDefined();

        // [3] Poll for Reachability Expansion (A -> B)
        let reach: any;
        for (let i = 0; i < 20; i++) {
            reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .selectAll()
                .executeTakeFirst();
            if (reach) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reach).toBeDefined();
        expect(reach.depth).toBe(1);

        // [4] Poll for Graph Counters
        // Task A: 1 outgoing
        // Task B: 1 incoming
        let taskA: any;
        let taskB: any;
        for (let i = 0; i < 20; i++) {
            taskA = await db
                .selectFrom('project_task')
                .where('id', '=', taskAId)
                .select(['direct_outgoing_count', 'total_outgoing_count'])
                .executeTakeFirst();
            taskB = await db
                .selectFrom('project_task')
                .where('id', '=', taskBId)
                .select(['direct_incoming_count', 'total_incoming_count'])
                .executeTakeFirst();

            if (
                taskA?.direct_outgoing_count === 1 &&
                taskB?.direct_incoming_count === 1
            )
                break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(taskA.direct_outgoing_count).toBe(1);
        expect(taskA.total_outgoing_count).toBe(1);
        expect(taskB.direct_incoming_count).toBe(1);
        expect(taskB.total_incoming_count).toBe(1);

        // [5] Create Second Link: B -> C
        // This should create transitive reachability A -> C
        await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskBId,
                    targetTaskId: taskCId,
                    label: 'blocks',
                },
            },
            token: ownerToken,
        });

        // Poll for Transitive Reachability (A -> C, depth 2)
        let reachAC: any;
        for (let i = 0; i < 20; i++) {
            reachAC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskCId)
                .selectAll()
                .executeTakeFirst();
            if (reachAC) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reachAC).toBeDefined();
        expect(reachAC.depth).toBe(2);

        // Verify Task A total_outgoing should be 2 (B and C)
        let taskAFinal: any;
        for (let i = 0; i < 20; i++) {
            taskAFinal = await db
                .selectFrom('project_task')
                .where('id', '=', taskAId)
                .select(['direct_outgoing_count', 'total_outgoing_count'])
                .executeTakeFirst();
            if (taskAFinal?.total_outgoing_count === 2) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(taskAFinal.direct_outgoing_count).toBe(1);
        expect(taskAFinal.total_outgoing_count).toBe(2);
    });

    it('should allow project member to create a link', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'relates to',
                },
            },
            token: memberToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.task.createLink.label).toBe('relates to');
    });

    it('should fail if tasks belong to different projects', async () => {
        // Create another project and a task in it
        const p2Res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Other Project' },
            token: ownerToken,
        });
        const p2Id = p2Res.body.data.createProject.id;
        const resOther = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId: p2Id, title: 'Task in P2' } },
            token: ownerToken,
        });
        const taskP2Id = resOther.body.data.task.create.id;

        // Try to link Task A (P1) to Task P2 (P2)
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskP2Id,
                    label: 'illegal',
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Unable to create link');
    });

    it('should fail if sourceTaskId == targetTaskId (Self-link)', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskAId,
                    label: 'self',
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Unable to create link');
    });

    it('should fail if tasks do not exist', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: fakeId,
                    label: 'void',
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Unable to create link');
    });

    it('should fail for duplicate links', async () => {
        // Create first link
        await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'first',
                },
            },
            token: ownerToken,
        });

        // Try to create same link again
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'duplicate',
                },
            },
            token: ownerToken,
        });

        // This should trigger a database error which translates to a GraphQL error
        expect(res.body.errors).toBeDefined();
    });

    it('should fail for a stranger', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'stranger',
                },
            },
            token: strangerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('Unable to create link');
    });

    it('should fail when unauthenticated', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'ghost',
                },
            },
        });

        expect(res.status).toBe(401);
    });
});
