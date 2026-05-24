import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { ADD_PROJECT_MEMBERS, CREATE_PROJECT } from './mutation.ts';
import { GET_USER_PROJECTS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project High Volume Write/Read Stress Test E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;

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
                email: 'volume-tester@example.com',
                username: 'volume_user',
                password_hash: 'a',
                projects_count: 0,
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should handle 100 concurrent writes and 200 concurrent reads simultaneously', async () => {
        const WRITE_COUNT = 100;
        const READ_COUNT = 200;

        // 1. Prepare Writes
        const writeRequests = Array.from({ length: WRITE_COUNT }, (_, i) =>
            gqlRequest({
                query: CREATE_PROJECT,
                variables: { name: `Volume Project ${i}` },
                token: token1,
            }),
        );

        // 2. Prepare Reads (initially against empty or small set, then growing)
        const readRequests = Array.from({ length: READ_COUNT }, () =>
            gqlRequest({
                query: GET_USER_PROJECTS,
                variables: { first: 10 },
                token: token1,
            }),
        );

        // Execute all concurrently
        const results = await Promise.all([...writeRequests, ...readRequests]);

        const writeResults = results.slice(0, WRITE_COUNT);
        const readResults = results.slice(WRITE_COUNT);

        // Verify Writes
        for (const res of writeResults) {
            expect(res.status).toBe(200);
            expect(res.body.data.createProject.id).toBeDefined();
        }

        // Verify Reads
        for (const res of readResults) {
            expect(res.status).toBe(200);
            expect(res.body.data.me.projects).toBeDefined();
        }

        // Final DB verification
        const projectsInDb = await db
            .selectFrom('project')
            .select('id')
            .where('fk_user_id', '=', user1.id)
            .execute();

        expect(projectsInDb).toHaveLength(WRITE_COUNT);
    }, 60000);

    it('should handle mass member additions (500 members) in parallel batches', async () => {
        // Create 1 project
        const projectRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Mass Member Project' },
            token: token1,
        });
        const projectId = projectRes.body.data.createProject.id;

        const TOTAL_MEMBERS = 500;
        const BATCH_SIZE = 50;

        // Pre-create 500 users
        const userValues = Array.from({ length: TOTAL_MEMBERS }, (_, i) => ({
            email: `bulk${i}@volume.com`,
            username: `bulk_${i}`,
            password_hash: 'a',
        }));

        await db.insertInto('users').values(userValues).execute();
        const allUsers = await db
            .selectFrom('users')
            .select('id')
            .where('email', 'like', 'bulk%')
            .execute();
        const userIds = allUsers.map((u) => u.id);

        // Run 10 parallel batches of 50 members each
        const batches = [];
        for (let i = 0; i < TOTAL_MEMBERS; i += BATCH_SIZE) {
            batches.push(userIds.slice(i, i + BATCH_SIZE));
        }

        const requests = batches.map((batch) =>
            gqlRequest({
                query: ADD_PROJECT_MEMBERS,
                variables: { projectId, userIds: batch },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.addProjectMembers.success).toBe(true);
        }

        // Verify total member count
        const countRes = await db
            .selectFrom('project_member')
            .select(db.fn.count('id').as('count'))
            .where('fk_project_id', '=', projectId)
            .executeTakeFirstOrThrow();

        expect(Number(countRes.count)).toBe(TOTAL_MEMBERS);
    }, 60000);
});
