import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { GET_ME, GET_USER_BY_ID, GET_USERS_BY_IDS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Auth Queries E2E', () => {
    let user1: { id: string; username: string; email: string };
    let user2: { id: string; username: string; email: string };
    let token1: string;

    beforeEach(async () => {
        // Full isolation: Start every test with a clean slate
        await cleanupDb();

        const res1 = await db
            .insertInto('users')
            .values({
                email: 'query-test-1@example.com',
                username: 'query_user_1',
                password_hash: 'a',
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        const res2 = await db
            .insertInto('users')
            .values({
                email: 'query-test-2@example.com',
                username: 'query_user_2',
                password_hash: 'a',
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        user1 = res1;
        user2 = res2;

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    afterAll(async () => {
        await cleanupDb();
    });

    describe('me', () => {
        it('should return null when unauthenticated', async () => {
            const response = await gqlRequest({
                query: GET_ME,
            });

            expect(response.status).toBe(200);
            expect(response.body.data.me).toBeNull();
        });

        it('should return the current user when authenticated', async () => {
            const response = await gqlRequest({
                query: GET_ME,
                token: token1,
            });

            expect(response.status).toBe(200);
            expect(response.body.data.me.id).toBe(user1.id);
            expect(response.body.data.me.username).toBe(user1.username);
        });
    });

    describe('user(id)', () => {
        it('should fetch a single user by ID', async () => {
            const response = await gqlRequest({
                query: GET_USER_BY_ID,
                variables: { id: user2.id },
            });

            expect(response.status).toBe(200);
            expect(response.body.data.user.id).toBe(user2.id);
            expect(response.body.data.user.username).toBe(user2.username);
        });

        it('should return null for non-existent ID', async () => {
            const response = await gqlRequest({
                query: GET_USER_BY_ID,
                variables: { id: '00000000-0000-0000-0000-000000000000' },
            });

            expect(response.status).toBe(200);
            expect(response.body.data.user).toBeNull();
        });
    });

    describe('users(ids)', () => {
        it('should fetch multiple users by IDs', async () => {
            const response = await gqlRequest({
                query: GET_USERS_BY_IDS,
                variables: { ids: [user1.id, user2.id] },
            });

            expect(response.status).toBe(200);
            const users = response.body.data.users;
            expect(users).toHaveLength(2);
            expect(users.map((u: any) => u.id)).toContain(user1.id);
            expect(users.map((u: any) => u.id)).toContain(user2.id);
        });

        it('should return empty array for empty IDs list', async () => {
            const response = await gqlRequest({
                query: GET_USERS_BY_IDS,
                variables: { ids: [] },
            });

            expect(response.status).toBe(200);
            expect(response.body.data.users).toHaveLength(0);
        });
    });
});
