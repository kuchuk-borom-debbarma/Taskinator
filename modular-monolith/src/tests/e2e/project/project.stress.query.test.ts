import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import {
    GET_BATCH_PROJECTS,
    GET_SINGLE_PROJECT,
    GET_USER_PROJECTS,
} from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Query Stress Test E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;
    let projectIds: string[] = [];

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();
        projectIds = [];

        const res1 = await db
            .insertInto('users')
            .values({
                email: 'query-tester@example.com',
                username: 'query_user',
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

        // Seed some projects
        const SEED_COUNT = 20;
        for (let i = 0; i < SEED_COUNT; i++) {
            const p = await db
                .insertInto('project')
                .values({
                    name: `Project ${i}`,
                    fk_user_id: user1.id,
                })
                .returning('id')
                .executeTakeFirstOrThrow();
            projectIds.push(p.id);
        }
    });

    it('should handle 100 concurrent single project queries', async () => {
        const CONCURRENCY = 100;
        const requests = Array.from({ length: CONCURRENCY }, (_, i) =>
            gqlRequest({
                query: GET_SINGLE_PROJECT,
                variables: { id: projectIds[i % projectIds.length] },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.project.id).toBeDefined();
        }
    });

    it('should handle 50 concurrent batch project queries', async () => {
        const CONCURRENCY = 50;
        const requests = Array.from({ length: CONCURRENCY }, () =>
            gqlRequest({
                query: GET_BATCH_PROJECTS,
                variables: { ids: projectIds.slice(0, 10) },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.projects).toHaveLength(10);
        }
    });

    it('should handle 50 concurrent paginated user project queries', async () => {
        const CONCURRENCY = 50;
        const requests = Array.from({ length: CONCURRENCY }, () =>
            gqlRequest({
                query: GET_USER_PROJECTS,
                variables: { first: 10 },
                token: token1,
            }),
        );

        const results = await Promise.all(requests);

        for (const res of results) {
            expect(res.status).toBe(200);
            expect(res.body.data.me.projects.edges).toBeDefined();
            expect(res.body.data.me.projects.totalCount).toBe(
                projectIds.length,
            );
        }
    });
});
