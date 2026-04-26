import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { SIGN_IN } from './mutation.ts';
import { GET_ME } from './query.ts';

describe('Auth E2E', () => {
    const testEmail = 'e2e-test@example.com';
    const testPassword = 'secure-password-123';
    let userId: string;

    beforeEach(async () => {
        // Full isolation: Start every test with a clean slate
        await cleanupDb();

        // Create a test user with a hashed password
        const passwordHash = await Bun.password.hash(testPassword);
        const result = await db
            .insertInto('users')
            .values({
                email: testEmail,
                username: 'e2e_test_user',
                password_hash: passwordHash,
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        userId = result.id;
    });

    afterAll(async () => {
        await cleanupDb();
    });

    it('should sign in successfully with correct credentials', async () => {
        const response = await gqlRequest({
            query: SIGN_IN,
            variables: {
                email: testEmail,
                password_raw: testPassword,
            },
        });

        expect(response.status).toBe(200);
        expect(response.body.data.signIn.token).toBeDefined();

        const token = response.body.data.signIn.token;

        // Verify the token works by fetching 'me'
        const meResponse = await gqlRequest({
            query: GET_ME,
            token,
        });

        expect(meResponse.status).toBe(200);
        expect(meResponse.body.data.me.id).toBe(userId);
        expect(meResponse.body.data.me.email).toBe(testEmail);
    });

    it('should fail to sign in with incorrect password', async () => {
        const response = await gqlRequest({
            query: SIGN_IN,
            variables: {
                email: testEmail,
                password_raw: 'wrong-password',
            },
        });

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toBe(
            'Invalid email or password',
        );
    });

    it('should fail to sign in with non-existent email', async () => {
        const response = await gqlRequest({
            query: SIGN_IN,
            variables: {
                email: 'non-existent@example.com',
                password_raw: testPassword,
            },
        });

        expect(response.body.errors).toBeDefined();
        expect(response.body.errors[0].message).toBe(
            'Invalid email or password',
        );
    });
});
