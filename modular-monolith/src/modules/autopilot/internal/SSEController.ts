import { logger } from '../../../logger';

export const handleSSE = async (req: Request): Promise<Response> => {
    const { signal } = req;

    logger.info('[SSE] New client connected to autopilot-logs');

    const stream = new ReadableStream({
        start(controller) {
            // Hollowed out: keep connection alive but do not subscribe to legacy event bus
            signal.addEventListener('abort', () => {
                logger.info('[SSE] Client disconnected');
                controller.close();
            });
        },
        cancel() {
            logger.info('[SSE] Stream cancelled');
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        },
    });
};
