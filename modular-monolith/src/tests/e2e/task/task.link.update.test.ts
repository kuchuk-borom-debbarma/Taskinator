import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, CREATE_TASK_LINK, UPDATE_TASK_LINK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Link Update E2E', () => {
    let owner: any;
    let ownerToken: string;
    let projectId: string;
    let taskAId: string;
    let taskBId: string;
    let taskCId: string;
    let taskDId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

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
            variables: { name: 'Engineering Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

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
        const resD = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task D' } },
            token: ownerToken,
        });
        taskDId = resD.body.data.task.create.id;
    });

    it('should allow owner to update a link label', async () => {
        const lRes = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskAId,
                    targetTaskId: taskBId,
                    label: 'old-label',
                },
            },
            token: ownerToken,
        });
        const linkId = lRes.body.data.task.createLink.id;

        const uRes = await gqlRequest({
            query: UPDATE_TASK_LINK,
            variables: { input: { projectId, linkId, label: 'new-label' } },
            token: ownerToken,
        });

        expect(uRes.status).toBe(200);
        expect(uRes.body.data.task.updateLink.label).toBe('new-label');

        const dbLink = await db
            .selectFrom('task_link')
            .where('id', '=', linkId)
            .selectAll()
            .executeTakeFirst();
        expect(dbLink?.label).toBe('new-label');
    });

    it('should update reachability when source/target tasks are changed', async () => {
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

        // Poll for reachability A -> B
        for (let i = 0; i < 20; i++) {
            const reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .executeTakeFirst();
            if (reach) break;
            await new Promise((r) => setTimeout(r, 200));
        }

        // [2] Update Link: Change target from B to C (A -> C)
        await gqlRequest({
            query: UPDATE_TASK_LINK,
            variables: { input: { projectId, linkId, targetTaskId: taskCId } },
            token: ownerToken,
        });

        // [3] Poll for Reachability update: A -> B gone, A -> C exists
        let reachABRemoved = false;
        let reachACAdded = false;
        for (let i = 0; i < 20; i++) {
            const reachAB = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskBId)
                .executeTakeFirst();
            const reachAC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskCId)
                .executeTakeFirst();

            if (!reachAB) reachABRemoved = true;
            if (reachAC) reachACAdded = true;

            if (reachABRemoved && reachACAdded) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reachABRemoved).toBe(true);
        expect(reachACAdded).toBe(true);
    });

    it('should update transitive paths when a bridge is redirected', async () => {
        // [1] Setup A -> B -> C
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

        // [2] Redirect B -> C to B -> D (Resulting in A -> B -> D)
        await gqlRequest({
            query: UPDATE_TASK_LINK,
            variables: {
                input: { projectId, linkId: linkBCId, targetTaskId: taskDId },
            },
            token: ownerToken,
        });

        // [3] Poll for Transitive update: A -> C gone, A -> D exists
        let reachACRemoved = false;
        let reachADAdded = false;
        for (let i = 0; i < 20; i++) {
            const reachAC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskCId)
                .executeTakeFirst();
            const reachAD = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskAId)
                .where('descendant_task_id', '=', taskDId)
                .executeTakeFirst();

            if (!reachAC) reachACRemoved = true;
            if (reachAD) reachADAdded = true;

            if (reachACRemoved && reachADAdded) break;
            await new Promise((r) => setTimeout(r, 200));
        }
        expect(reachACRemoved).toBe(true);
        expect(reachADAdded).toBe(true);
    });
});
