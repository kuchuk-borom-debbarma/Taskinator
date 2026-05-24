import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { waitFor } from '../../../infra/__tests__/helpers/waitFor.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, CREATE_TASK_LINK, DELETE_TASK_LINK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Graph Reachability Stress Test E2E', () => {
    let owner: any;
    let ownerToken: string;
    let projectId: string;

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
                email: 'reachability-stress@test.com',
                username: 'graph_master',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        const projectRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Graph Stress Project' },
            token: ownerToken,
        });
        projectId = projectRes.body.data.createProject.id;
    });

    it('should maintain correctness in a deep chain (50 tasks)', async () => {
        const CHAIN_LENGTH = 50;
        const taskIds: string[] = [];

        // 1. Create 50 tasks
        for (let i = 0; i < CHAIN_LENGTH; i++) {
            const res = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: `Task ${i}` } },
                token: ownerToken,
            });
            taskIds.push(res.body.data.task.create.id);
        }

        // 2. Create chain: T0 -> T1 -> T2 ... -> T49
        for (let i = 0; i < CHAIN_LENGTH - 1; i++) {
            await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: taskIds[i],
                        targetTaskId: taskIds[i + 1],
                        label: 'blocks',
                    },
                },
                token: ownerToken,
            });
        }

        // 3. Verify reachability T0 -> T49 (depth 49)
        await waitFor(async () => {
            const reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', taskIds[0]!)
                .where('descendant_task_id', '=', taskIds[CHAIN_LENGTH - 1]!)
                .select(['depth'])
                .executeTakeFirst();

            if (!reach)
                throw new Error('Transitive reachability not found yet');
            expect(Number(reach.depth)).toBe(CHAIN_LENGTH - 1);
        }, 30000);

        // 4. Verify T0 total_outgoing_count = 49
        await waitFor(async () => {
            const task0 = await db
                .selectFrom('project_task')
                .where('id', '=', taskIds[0]!)
                .select(['total_outgoing_count'])
                .executeTakeFirstOrThrow();

            expect(Number(task0.total_outgoing_count)).toBe(CHAIN_LENGTH - 1);
        }, 10000);
    }, 90000);

    it('should handle a dense hub-and-spoke graph (50 concurrent links)', async () => {
        const SPOKE_COUNT = 50;

        // 1. Create hub
        const hubRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Hub Task' } },
            token: ownerToken,
        });
        const hubId = hubRes.body.data.task.create.id;

        // 2. Create spokes
        const spokeRequests = Array.from({ length: SPOKE_COUNT }, (_, i) =>
            gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: `Spoke ${i}` } },
                token: ownerToken,
            }),
        );
        const spokeResults = await Promise.all(spokeRequests);
        const spokeIds = spokeResults.map(
            (res) => res.body.data.task.create.id,
        );

        // 3. Link hub to all spokes concurrently
        const linkRequests = spokeIds.map((spokeId) =>
            gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: hubId,
                        targetTaskId: spokeId,
                        label: 'spoke',
                    },
                },
                token: ownerToken,
            }),
        );
        await Promise.all(linkRequests);

        // 4. Verify hub counts
        await waitFor(async () => {
            const hub = await db
                .selectFrom('project_task')
                .where('id', '=', hubId)
                .select(['direct_outgoing_count', 'total_outgoing_count'])
                .executeTakeFirstOrThrow();

            expect(hub.direct_outgoing_count).toBe(SPOKE_COUNT);
            expect(hub.total_outgoing_count).toBe(SPOKE_COUNT);
        }, 15000);
    }, 45000);

    it('should correctly repair graph on link deletion (contraction)', async () => {
        // 1. Setup chain: A -> B -> C -> D
        const resA = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task A' } },
            token: ownerToken,
        });
        const resB = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task B' } },
            token: ownerToken,
        });
        const resC = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task C' } },
            token: ownerToken,
        });
        const resD = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task D' } },
            token: ownerToken,
        });

        const [idA, idB, idC, idD] = [resA, resB, resC, resD].map(
            (r) => r.body.data.task.create.id,
        );

        // A -> B
        await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: idA,
                    targetTaskId: idB,
                    label: 'l1',
                },
            },
            token: ownerToken,
        });
        // B -> C
        const resL2 = await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: idB,
                    targetTaskId: idC,
                    label: 'l2',
                },
            },
            token: ownerToken,
        });
        const linkBCId = resL2.body.data.task.createLink.id;
        // C -> D
        await gqlRequest({
            query: CREATE_TASK_LINK,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: idC,
                    targetTaskId: idD,
                    label: 'l3',
                },
            },
            token: ownerToken,
        });

        // Verify A reaches D (depth 3)
        await waitFor(async () => {
            const reach = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', idA)
                .where('descendant_task_id', '=', idD)
                .selectAll()
                .executeTakeFirst();

            if (!reach) throw new Error('Not reached');
            expect(Number(reach.depth)).toBe(3);
        }, 10000);

        // 2. Delete B -> C
        await gqlRequest({
            query: DELETE_TASK_LINK,
            variables: { projectId, linkId: linkBCId },
            token: ownerToken,
        });

        // 3. Verify A NO LONGER reaches C or D
        await waitFor(async () => {
            const reachC = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', idA)
                .where('descendant_task_id', '=', idC)
                .executeTakeFirst();
            const reachD = await db
                .selectFrom('task_reachability')
                .where('ancestor_task_id', '=', idA)
                .where('descendant_task_id', '=', idD)
                .executeTakeFirst();
            const taskA = await db
                .selectFrom('project_task')
                .where('id', '=', idA)
                .select('total_outgoing_count')
                .executeTakeFirstOrThrow();

            if (reachC || reachD) throw new Error('Reachability still exists');
            expect(Number(taskA.total_outgoing_count)).toBe(1); // Only A -> B remains
        }, 15000);
    }, 45000);

    it('should handle concurrent link deletions without deadlocks', async () => {
        const SPOKE_COUNT = 30;
        const hubRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Mega Hub' } },
            token: ownerToken,
        });
        const hubId = hubRes.body.data.task.create.id;

        const spokeIds = [];
        for (let i = 0; i < SPOKE_COUNT; i++) {
            const res = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title: `S ${i}` } },
                token: ownerToken,
            });
            spokeIds.push(res.body.data.task.create.id);
        }

        const linkIds = [];
        for (const sid of spokeIds) {
            const res = await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: {
                        projectId,
                        sourceTaskId: hubId,
                        targetTaskId: sid,
                        label: 'spoke',
                    },
                },
                token: ownerToken,
            });
            linkIds.push(res.body.data.task.createLink.id);
        }

        // Wait for all to be linked
        await waitFor(async () => {
            const hub = await db
                .selectFrom('project_task')
                .where('id', '=', hubId)
                .select('direct_outgoing_count')
                .executeTakeFirstOrThrow();
            expect(hub.direct_outgoing_count).toBe(SPOKE_COUNT);
        }, 10000);

        // Concurrently delete all 30 links
        const deleteRequests = linkIds.map((lid) =>
            gqlRequest({
                query: DELETE_TASK_LINK,
                variables: { projectId, linkId: lid },
                token: ownerToken,
            }),
        );
        await Promise.all(deleteRequests);

        // Verify final state is 0
        await waitFor(async () => {
            const hub = await db
                .selectFrom('project_task')
                .where('id', '=', hubId)
                .select('direct_outgoing_count')
                .executeTakeFirstOrThrow();
            expect(hub.direct_outgoing_count).toBe(0);
        }, 15000);
    }, 60000);
});
