import { logger } from '../../../logger';
import eventBus from '../../../utils/EventBus.ts';

export const handleSSE = async (req: Request): Promise<Response> => {
    const { signal } = req;

    logger.info('[SSE] New client connected to autopilot-logs');

    const stream = new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            const onUpdate = (event: any) => {
                const data = `event: execution_updated\ndata: ${JSON.stringify(event)}\n\n`;
                controller.enqueue(encoder.encode(data));
            };

            const onStep = (event: any) => {
                const data = `event: step_created\ndata: ${JSON.stringify(event)}\n\n`;
                controller.enqueue(encoder.encode(data));
            };

            // Subscribe to event bus
            eventBus.subscribe('autopilot-events', 'sse-client', {
                'autopilot.execution.updated': onUpdate,
                'autopilot.step.created': onStep,
            });

            signal.addEventListener('abort', () => {
                logger.info('[SSE] Client disconnected');
                // Cleanup would ideally remove the specific subscription
                // For now, our MemoryBus doesn't support easy unsubscription by callback
                // but since it's a monolith we'll manage it.
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
