import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';

const API_BASE_URL = 'http://127.0.0.1:3000';

/**
 * useRealtime hook establishes a Server-Sent Events (SSE) connection
 * to the backend and triggers React Query invalidations when
 * tasks or notifications are updated in real-time.
 */
export const useRealtime = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const handleEvent = useCallback((event: MessageEvent) => {
        try {
            const type = event.type;
            const data = JSON.parse(event.data);

            if (!userId) return;

            switch (type) {
                case 'task_created':
                case 'task_updated':
                case 'task_deleted':
                    // Invalidate all task lists for the affected project and user
                    queryClient.invalidateQueries({ queryKey: ['tasks', data.projectId, userId] });
                    break;

                case 'notification_created':
                    // Invalidate unread count and notification list for this user
                    queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
                    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                    break;

                default:
                    break;
            }
        } catch (err) {
            logger.error('[Realtime] Failed to parse SSE message:', err);
        }
    }, [queryClient, userId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !userId) return;

        // Establish the SSE stream with the JWT in the query param
        const url = `${API_BASE_URL}/realtime/stream?token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(url);

        logger.info('[Realtime] Connecting to SSE stream...');

        // Listen for specific domain events
        eventSource.addEventListener('task_created', handleEvent);
        eventSource.addEventListener('task_updated', handleEvent);
        eventSource.addEventListener('task_deleted', handleEvent);
        eventSource.addEventListener('notification_created', handleEvent);

        eventSource.onopen = () => {
            logger.info('[Realtime] SSE connection established');
        };

        eventSource.onerror = (err) => {
            logger.error('[Realtime] SSE connection error or closed:', err);
            // Browser handles reconnection automatically for EventSource
        };

        return () => {
            logger.info('[Realtime] Closing SSE connection');
            eventSource.close();
        };
    }, [handleEvent]);
};
