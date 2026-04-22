import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Creation E2E', () => {
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
                email: 'creator@example.com',
                username: 'creator_user',
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

    it('should create a project and verify background count increment', async () => {
        // [1] Initial State
        const initialUser = await db
            .selectFrom('users')
            .select('projects_count')
            .where('id', '=', user1.id)
            .executeTakeFirstOrThrow();
        expect(initialUser.projects_count).toBe(0);

        // [2] Mutation
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Automated Flow Project' },
            token: token1,
        });
        expect(createRes.status).toBe(200);

        // [3] Background Check (Wait for increment)
        let finalCount = 0;
        let attempts = 0;
        while (attempts < 20) {
            const user = await db
                .selectFrom('users')
                .select('projects_count')
                .where('id', '=', user1.id)
                .executeTakeFirstOrThrow();
            if (user.projects_count > 0) {
                finalCount = user.projects_count;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        expect(finalCount).toBe(1);
    }, 15000);
});
