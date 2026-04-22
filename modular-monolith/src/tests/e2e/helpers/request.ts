import request from 'supertest';
import { logger } from '../../../logger';
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
    logger.debug(
        `E2E GQL Request: ${query.split('{')[1]?.split('(')[0]?.trim() || 'Anonymous'}`,
    );

    const req = request(testServer).post('/graphql');

    if (token) {
        req.set('Authorization', `Bearer ${token}`);
    }

    const response = await req.send({
        query,
        variables,
    });

    if (response.status !== 200 || response.body.errors) {
        logger.warn(
            `E2E GQL Response Error [${response.status}]:`,
            response.body.errors,
        );
    } else {
        logger.debug(`E2E GQL Response Success [${response.status}]`);
    }

    return response;
}
