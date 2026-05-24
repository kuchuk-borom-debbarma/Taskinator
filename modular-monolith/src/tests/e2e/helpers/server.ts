import { createServer } from 'node:http';
import { bootstrap, shutdown } from '../../../app.ts';
import { yoga } from '../../../infra/graphql/index.ts';

/**
 * Automatically bootstraps the entire production infrastructure for E2E tests.
 * Ensures the tests run on the exact same logic path as the real app.
 */
export async function bootstrapE2E() {
    await bootstrap({ silent: true });
}

export async function teardownE2E() {
    await shutdown();
}

/**
 * A shared HTTP server instance for E2E tests.
 * This uses the production Yoga instance.
 */
export const testServer = createServer(yoga);
