import { createServer } from 'node:http';
import { yoga } from '../../../graphql/index.ts';

/**
 * A shared HTTP server instance for E2E tests.
 * Using a single instance avoids overhead and ensures consistent behavior.
 */
export const testServer = createServer(yoga);
