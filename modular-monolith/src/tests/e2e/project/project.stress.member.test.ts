import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import {
    ADD_PROJECT_MEMBERS,
    CREATE_PROJECT,
    REMOVE_PROJECT_MEMBERS,
} from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Member Stress Test E2E', () => {
    let owner: { id: string; username: string; email: string };
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

        // 1. Create owner
        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@example.com',
                username: 'owner_user',
                password_hash: 'a',
                projects_count: 0,
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        // 2. Create project
        const projectRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Stress Project' },
            token: ownerToken,
        });
        projectId = projectRes.body.data.createProject.id;
    });

    it('should handle 50 concurrent member additions and verify unique constraints', async () => {
        const CONCURRENCY = 50;

        // Create 50 unique users
        const users = await Promise.all(
            Array.from({ length: CONCURRENCY }, (_, i) =>
                db
                    .insertInto('users')
                    .values({
                        email: `user${i}@stress.com`,
                        username: `user_${i}`,
                        password_hash: 'a',
                        projects_count: 0,
                    })
                    .returning(['id'])
                    .executeTakeFirstOrThrow(),
            ),
        );

        const userIds = users.map((u) => u.id);

        // Add each member concurrently in individual requests (if mutation allows batching, we stress that too)
        // Here we use the ADD_PROJECT_MEMBERS which takes an array.
        // We will call it concurrently with different users.
        const requests = userIds.map((id) =>
            gqlRequest({
                query: ADD_PROJECT_MEMBERS,
                variables: { projectId, userIds: [id] },
                token: ownerToken,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.addProjectMembers.success).toBe(true);
        }

        // Verify total members in DB (owner + 50)
        const members = await db
            .selectFrom('project_member')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();

        // Owner is NOT automatically a member in this domain rules (based on memory)
        // Let's check memory: "Strict Owner (owner is not automatically a member)"
        expect(members).toHaveLength(CONCURRENCY);
    }, 30000);

    it('should handle race conditions when adding same member concurrently', async () => {
        const targetUser = await db
            .insertInto('users')
            .values({
                email: 'race@stress.com',
                username: 'race_user',
                password_hash: 'a',
                projects_count: 0,
            })
            .returning(['id'])
            .executeTakeFirstOrThrow();

        // 10 concurrent requests to add same user
        const requests = Array.from({ length: 10 }, () =>
            gqlRequest({
                query: ADD_PROJECT_MEMBERS,
                variables: { projectId, userIds: [targetUser.id] },
                token: ownerToken,
            }),
        );

        const results = await Promise.all(requests);

        // Expect at least one to succeed. Others might fail with "Already a member" error
        // but they shouldn't crash the server.
        const successes = results.filter(
            (r) => r.body.data?.addProjectMembers?.success === true,
        );
        const errors = results.filter((r) => r.body.errors);

        expect(successes.length).toBeGreaterThanOrEqual(1);

        // Check DB - should only have 1 entry for this user
        const memberCount = await db
            .selectFrom('project_member')
            .select(db.fn.count('id').as('count'))
            .where('fk_project_id', '=', projectId)
            .where('fk_user_id', '=', targetUser.id)
            .executeTakeFirstOrThrow();

        expect(Number(memberCount.count)).toBe(1);
    });

    it('should handle concurrent member removals', async () => {
        const CONCURRENCY = 20;
        const users = await Promise.all(
            Array.from({ length: CONCURRENCY }, (_, i) =>
                db
                    .insertInto('users')
                    .values({
                        email: `rem${i}@stress.com`,
                        username: `rem_${i}`,
                        password_hash: 'a',
                    })
                    .returning(['id'])
                    .executeTakeFirstOrThrow(),
            ),
        );

        // Add them first
        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: users.map((u) => u.id) },
            token: ownerToken,
        });

        // Concurrently remove them
        const requests = users.map((u) =>
            gqlRequest({
                query: REMOVE_PROJECT_MEMBERS,
                variables: { projectId, memberIds: [u.id] },
                token: ownerToken,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.removeProjectMembers.success).toBe(true);
        }

        const members = await db
            .selectFrom('project_member')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();

        expect(members).toHaveLength(0);
    });
});
