import { db } from '../../database';
import eventBus from '../EventBus.ts';
import { OUTBOX_TOPIC_TO_EVENT_TYPE } from './constants.ts';

let isRunning = false;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

export const startOutboxRelay = () => {
    if (isRunning) return;
    isRunning = true;
    
    const poll = async () => {
        if (!isRunning) return;
        
        try {
            const events = await db.selectFrom('outbox_events')
                .selectAll()
                .where('status', '=', 'PENDING')
                .orderBy('created_at', 'asc')
                .limit(100)
                .execute();
            
            if (events.length > 0) {
                // Group events by topic to optimize kafka publishing
                const byTopic: Record<string, Array<{ key: string, data: any }>> = {};
                for (const event of events) {
                    const topic = event.kafka_topic;
                    if (!byTopic[topic]) {
                        byTopic[topic] = [];
                    }
                    byTopic[topic]!.push({
                        key: event.kafka_key,
                        data: event.payload,
                    });
                }
                
                // Publish batches per topic, translating raw kafka_topic → event type code
                for (const [topic, payloads] of Object.entries(byTopic)) {
                    const eventType = OUTBOX_TOPIC_TO_EVENT_TYPE[topic];
                    if (!eventType) {
                        console.warn(`[Outbox Relay] No event type mapping for topic: ${topic}`);
                        continue;
                    }
                    await eventBus.publish(eventType, payloads);
                }
                
                // Delete processed outbox events to keep database lean (10k RPS optimization)
                await db.deleteFrom('outbox_events')
                    .where('id', 'in', events.map(e => e.id))
                    .execute();
            }
        } catch (err) {
            console.error('[Outbox Relay] Error processing events:', err);
        } finally {
            if (isRunning) {
                timeoutId = setTimeout(poll, 1000); 
            }
        }
    };
    
    poll();
    console.log('[Outbox Relay] Started polling for wCTE outbox events');
};

export const stopOutboxRelay = () => {
    isRunning = false;
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
    console.log('[Outbox Relay] Stopped.');
};
