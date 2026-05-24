import { bootstrap } from './app';
import { logger } from './infra/logger';

/**
 * Production Entry Point
 */
async function start() {
    try {
        const fetch = await bootstrap();

        const server = Bun.serve({
            fetch,
            port: Number(process.env.PORT) || 3000,
        });

        logger.info(`[Server] GraphQL API available at ${server.url}`);
    } catch (err) {
        logger.error('[Server] Fatal boot error', err);
        process.exit(1);
    }
}

start();
