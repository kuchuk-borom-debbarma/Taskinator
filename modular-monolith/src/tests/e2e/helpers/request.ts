import request from 'supertest';
import { testServer } from './server.ts';

interface GqlRequestParams {
    query: string;
    variables?: Record<string, any>;
    token?: string;
}

/**
 * A helper to make GraphQL requests more concise in tests.
 * Handles the URL, headers, and body formatting.
 */
export async function gqlRequest({
    query,
    variables,
    token,
}: GqlRequestParams) {
    const req = request(testServer).post('/graphql');

    if (token) {
        req.set('Authorization', `Bearer ${token}`);
    }

    const response = await req.send({
        query,
        variables,
    });

    return response;
}
