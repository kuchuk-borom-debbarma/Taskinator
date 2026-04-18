import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger.ts';

const API_GQL_URL = 'http://127.0.0.1:3000/graphql';

export const useRealtime = (userId: string | undefined, projectId: string | undefined) => {
    const queryClient = useQueryClient();
    const taskInvalidationTimer = useRef<NodeJS.Timeout>();

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
                    logger.info(`[Realtime] Task event: ${type} - Queuing Invalidations`);

                    // Debounce rapid bulk updates into a single network call
                    if (taskInvalidationTimer.current) clearTimeout(taskInvalidationTimer.current);

                    taskInvalidationTimer.current = setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: ['workspace', projectId, userId] });
                    }, 300); // 300ms pooling window
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
            if (taskInvalidationTimer.current) clearTimeout(taskInvalidationTimer.current);
            es.close();
        };
    }, [userId, projectId, handleMessage]);
};