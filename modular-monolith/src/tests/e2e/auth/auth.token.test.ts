import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { GET_ME } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Auth Token Validation E2E', () => {
    let userId: string;

    beforeEach(async () => {
        await cleanupDb();

        const result = await db
            .insertInto('users')
            .values({
                email: 'token-test@example.com',
                username: 'token_tester',
                password_hash: 'a',
            })
            .returning('id')
            .executeTakeFirstOrThrow();

        userId = result.id;
    });

    it('should return null for an expired token', async () => {
        // Create an expired token (issued in the past, expires 1s after issue)
        const expiredToken = jwt.sign(
            {
                id: userId,
                email: 'token-test@example.com',
                username: 'token_tester',
            },
            JWT_SECRET,
            { expiresIn: '-1s' }, // Negative expiry = already expired
        );

        const response = await gqlRequest({
            query: GET_ME,
            token: expiredToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.data.me).toBeNull();
    });

    it('should return null for a token with invalid signature', async () => {
        // Create a token with a different secret
        const invalidSecretToken = jwt.sign(
            {
                id: userId,
                email: 'token-test@example.com',
                username: 'token_tester',
            },
            'wrong-secret-key',
        );

        const response = await gqlRequest({
            query: GET_ME,
            token: invalidSecretToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.data.me).toBeNull();
    });

    it('should return null for a malformed token', async () => {
        const malformedToken = 'not.a.jwt.token';

        const response = await gqlRequest({
            query: GET_ME,
            token: malformedToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.data.me).toBeNull();
    });

    it('should return null for a token with missing required fields (like id)', async () => {
        // Token is validly signed but payload is missing 'id'
        const invalidPayloadToken = jwt.sign(
            { email: 'token-test@example.com' },
            JWT_SECRET,
        );

        const response = await gqlRequest({
            query: GET_ME,
            token: invalidPayloadToken,
        });

        expect(response.status).toBe(200);
        expect(response.body.data.me).toBeNull();
    });
});
