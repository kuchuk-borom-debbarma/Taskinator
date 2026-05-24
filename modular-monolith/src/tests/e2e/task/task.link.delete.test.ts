import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, CREATE_TASK_LINK, DELETE_TASK_LINK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Link Deletion E2E', () => {
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

        // Setup Users
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

        // Create Project
        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Engineering Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // Add 'member' to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();

        // Create 3 Tasks
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

    it('should allow project owner to delete a link and contract reachability', async () => {
        // [1] Create Link A -> B
        const lRes = await gqlRequest({
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
        const linkId = lRes.body.data.task.createLink.id;

        // Poll for reachability to exist first
        for (let i = 0; i < 20; i++) {
            const reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .executeTakeFirst();
            if (reach) break;
            await new Promise((r) => setTimeout(r, 200));
        }

        // [2] Delete Link
        const dRes = await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId },
            token: ownerToken,
        });
        expect(dRes.status).toBe(200);
        expect(dRes.body.data.task.deleteLink).toBe(linkId);

        // [3] Poll for Reachability Contraction
        let reachRemoved = false;
        for (let i = 0; i < 20; i++) {
            const reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .executeTakeFirst();
            if (!reach) {
                reachRemoved = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reachRemoved).toBe(true);

        // [4] Poll for Graph Counters decrement
        let countersReset = false;
        for (let i = 0; i < 20; i++) {
            const taskA = await db
                .selectFrom('project_task')
                .where('id', '=', taskAId)
                .select(['direct_outgoing_count'])
                .executeTakeFirst();
            if (taskA?.direct_outgoing_count === 0) {
                countersReset = true;
                break;
            }
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(countersReset).toBe(true);
    });

    it('should repair transitive paths when a bridge link is removed (A -> B -> C)', async () => {
        // [1] Create A -> B and B -> C
        await gqlRequest({
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
        const linkBCRes = await gqlRequest({
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
        const linkBCId = linkBCRes.body.data.task.createLink.id;

        // Poll for transitive reachability A -> C
        for (let i = 0; i < 20; i++) {
            const reachAC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskCId)
                .executeTakeFirst();
            if (reachAC) break;
            await new Promise((r) => setTimeout(r, 200));
        }

        // [2] Delete B -> C
        await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId: linkBCId },
            token: ownerToken,
        });

        // [3] Verify A -> C is gone, but A -> B remains
        let reachACRemoved = false;
        let reachABRemains = false;
        for (let i = 0; i < 20; i++) {
            const reachAC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskCId)
                .executeTakeFirst();
            const reachAB = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .executeTakeFirst();

            if (!reachAC) reachACRemoved = true;
            if (reachAB) reachABRemains = true;

            if (reachACRemoved && reachABRemains) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reachACRemoved).toBe(true);
        expect(reachABRemains).toBe(true);
    });

    it('should allow project member to delete a link', async () => {
        const lRes = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'member-link',
                },
            },
            token: ownerToken,
        });
        const linkId = lRes.body.data.task.createLink.id;

        const dRes = await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId },
            token: memberToken,
        });

        expect(dRes.status).toBe(200);
        expect(dRes.body.data.task.deleteLink).toBe(linkId);
    });

    it('should fail if a stranger tries to delete a link', async () => {
        const lRes = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'private-link',
                },
            },
            token: ownerToken,
        });
        const linkId = lRes.body.data.task.createLink.id;

        const dRes = await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId },
            token: strangerToken,
        });

        expect(dRes.body.errors).toBeDefined();
        expect(dRes.body.errors[0].message).toContain(
            'not found or unauthorized',
        );
    });

    it('should fail for non-existent link ID', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId: fakeId },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('not found');
    });
});
