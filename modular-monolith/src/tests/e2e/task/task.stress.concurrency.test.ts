import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, UPDATE_TASK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Concurrency & Locking Stress Test E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;
    let projectId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        user1 = await db
            .insertInto('users')
            .values({
                email: 'task-stress@test.com',
                username: 'task_stress_user',
                password_hash: 'a',
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );

        const projectRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Task Stress Project' },
            token: token1,
        });
        projectId = projectRes.body.data.createProject.id;
    });

    it('should enforce optimistic locking (only 1 of 50 concurrent updates succeeds)', async () => {
        // 1. Create a task
        const taskRes = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: { projectId, title: 'Optimistic Lock Task' },
            },
            token: token1,
        });
        const taskId = taskRes.body.data.task.create.id;
        const initialVersion = taskRes.body.data.task.create.version; // Should be 1

        // 2. Fire 50 concurrent updates trying to update version 1 -> 2
        const CONCURRENCY = 50;
        const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
            gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId,
                    input: {
                        projectId,
                        title: `Update ${i}`,
                        version: initialVersion,
                    },
                },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        // 3. Exactly one should have data, others should have error (Conflict)
        const successes = results.filter((res) => res.body.data?.task?.update);
        const errors = results.filter((res) => res.body.errors);

        expect(successes).toHaveLength(1);
        expect(errors.length).toBe(CONCURRENCY - 1);

        // Verify errors are conflict related
        expect(errors[0].body.errors[0].message).toMatch(
            /version mismatch|Conflict/i,
        );

        // 4. Verify final version in DB is 2
        const finalTask = await db
            .selectFrom('project_task')
            .select('version')
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();

        expect(finalTask.version).toBe(2);
    }, 30000);

    it('should handle high-throughput sequential updates (100 updates)', async () => {
        // 1. Create task
        const taskRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Sequential Task' } },
            token: token1,
        });
        const taskId = taskRes.body.data.task.create.id;
        let currentVersion = taskRes.body.data.task.create.version;

        // 2. 100 sequential updates
        const UPDATE_COUNT = 100;
        for (let i = 0; i < UPDATE_COUNT; i++) {
            const updateRes = await gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId,
                    input: {
                        projectId,
                        title: `Seq Update ${i}`,
                        version: currentVersion,
                    },
                },
                token: token1,
            });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.task.update.version).toBe(
                currentVersion + 1,
            );
            currentVersion = updateRes.body.data.task.update.version;
        }

        expect(currentVersion).toBe(101);
    }, 60000);

    it('should handle concurrent updates to 50 distinct tasks', async () => {
        // 1. Create 50 tasks
        const CONCURRENCY = 50;
        const creationRequests = Array.from({ length: CONCURRENCY }, (_, i) =>
            gqlRequest({
                query: CREATE_TASK,
                variables: {
                    input: { projectId, title: `Parallel Task ${i}` },
                },
                token: token1,
            }),
        );
        const creationResults = await Promise.all(creationRequests);
        const tasks = creationResults.map((res) => res.body.data.task.create);

        // 2. Update all 50 tasks concurrently
        const updateRequests = tasks.map((task, i) =>
            gqlRequest({
                query: UPDATE_TASK,
                variables: {
                    taskId: task.id,
                    input: {
                        projectId,
                        title: `Parallel Update ${i}`,
                        version: task.version,
                    },
                },
                token: token1,
            }),
        );

        const results = await Promise.all(updateRequests);

        // 3. All should succeed
        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.task.update.id).toBeDefined();
        }

        // 4. Verify DB
        const tasksInDb = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .where('version', '=', 2)
            .execute();

        expect(tasksInDb).toHaveLength(CONCURRENCY);
    }, 30000);
});
