import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Creation Stress Test E2E', () => {
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

        const res1 = await db
            .insertInto('users')
            .values({
                email: 'stress-tester@example.com',
                username: 'stress_user',
                password_hash: 'a',
                projects_count: 0,
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        user1 = res1;
        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should handle 50 concurrent project creations and background counter updates', async () => {
        const CONCURRENCY = 50;
        const projectNames = Array.from(
            { length: CONCURRENCY },
            (_, i) => `Project Stress ${i}`,
        );

        // Fire all mutations concurrently
        const requests = projectNames.map((name) =>
            gqlRequest({
                query: CREATE_PROJECT,
                variables: { name },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        // Verify all requests succeeded
        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.createProject.id).toBeDefined();
        }

        // Verify DB row count
        const projectsInDb = await db
            .selectFrom('project')
            .select('id')
            .where('fk_user_id', '=', user1.id)
            .execute();

        expect(projectsInDb).toHaveLength(CONCURRENCY);

        // Verify background projects_count increment
        // We wait for the counter to reach CONCURRENCY
        let finalCount = 0;
        let attempts = 0;
        const maxAttempts = 40; // 20 seconds total
        while (attempts < maxAttempts) {
            const user = await db
                .selectFrom('users')
                .select('projects_count')
                .where('id', '=', user1.id)
                .executeTakeFirstOrThrow();

            if (user.projects_count === CONCURRENCY) {
                finalCount = user.projects_count;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        expect(finalCount).toBe(CONCURRENCY);
    }, 30000);
});
