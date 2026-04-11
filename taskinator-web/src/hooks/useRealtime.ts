import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger.ts';

const API_GQL_URL = 'http://127.0.0.1:3000/graphql';

/**
 * useRealtime hook establishes a SINGLE Unified GraphQL Subscription over SSE
 * and triggers React Query invalidations based on the event type (__typename).
 */
export const useRealtime = (userId: string | undefined, projectId: string | undefined) => {
    const queryClient = useQueryClient();

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const result = JSON.parse(event.data);
            if (!result.data?.realtimeStream) return;

            const streamEvent = result.data.realtimeStream;
            const type = streamEvent.__typename;

            switch (type) {
                case 'TaskCreated':
                case 'TaskUpdated':
                case 'TaskDeleted':
                    logger.info(`[Realtime] Task event: ${type}`);
                    queryClient.invalidateQueries({ queryKey: ['workspace', projectId, userId] });
                    break;
                
                case 'InternalNotification':
                    logger.info('[Realtime] New notification received');
                    queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
                    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                    break;
                
                default:
                    logger.warn(`[Realtime] Unknown event type: ${type}`);
            }
        } catch (err) {
            // Heartbeats or other non-JSON messages might arrive
        }
    }, [queryClient, userId, projectId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !userId) return;

        // Unified Subscription for EVERYTHING
        // We pass projectId to filter task events, but notifications are global for the user.
        const query = `
            subscription {
                realtimeStream(projectId: "${projectId || ''}") {
                    __typename
                    ... on TaskCreated { task { id } }
                    ... on TaskUpdated { task { id } }
                    ... on TaskDeleted { id }
                    ... on InternalNotification { id }
                }
            }
        `.replace(/\s+/g, ' ').trim();

        const url = `${API_GQL_URL}?query=${encodeURIComponent(query)}&token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        
        es.onopen = () => logger.info('[Realtime] Unified Stream connection opened');
        es.onerror = (e) => logger.error('[Realtime] Unified Stream connection error', e);
        es.onmessage = handleMessage;
        
        return () => {
            logger.info('[Realtime] Closing Unified Stream connection');
            es.close();
        };
    }, [userId, projectId, handleMessage]);
};
