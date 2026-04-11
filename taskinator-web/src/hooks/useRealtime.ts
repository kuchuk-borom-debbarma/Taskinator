import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger.ts';

const API_GQL_URL = 'http://127.0.0.1:3000/graphql';

/**
 * useRealtime hook establishes a GraphQL Subscription over SSE
 * and triggers React Query invalidations when tasks or notifications are updated.
 */
export const useRealtime = (userId: string | undefined, projectId: string | undefined) => {
    const queryClient = useQueryClient();

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const result = JSON.parse(event.data);
            if (result.data) {
                // If it's a task event
                if (result.data.taskEvents) {
                    logger.info('[Realtime] Task event received via GraphQL Subscription');
                    queryClient.invalidateQueries({ queryKey: ['workspace', projectId, userId] });
                }
                
                // If it's a notification event
                if (result.data.notificationAdded) {
                    logger.info('[Realtime] New notification received');
                    queryClient.invalidateQueries({ queryKey: ['notifications-unread', userId] });
                    queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
                }
            }
        } catch (err) {
            // Heartbeats or other non-JSON messages might arrive
        }
    }, [queryClient, userId, projectId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !userId) return;

        // 1. Subscription for Tasks (only if projectId is selected)
        let taskES: EventSource | null = null;
        if (projectId) {
            const taskQuery = encodeURIComponent(`subscription { taskEvents(projectId: "${projectId}") { ... on TaskDeleted { id } } }`);
            const taskUrl = `${API_GQL_URL}?query=${taskQuery}&token=${encodeURIComponent(token)}`;
            taskES = new EventSource(taskUrl);
            taskES.onmessage = handleMessage;
            logger.info(`[Realtime] Subscribed to task events for project: ${projectId}`);
        }

        // 2. Subscription for Notifications (Global for user)
        const notifQuery = encodeURIComponent(`subscription { notificationAdded(userId: "${userId}") { id } }`);
        const notifUrl = `${API_GQL_URL}?query=${notifQuery}&token=${encodeURIComponent(token)}`;
        const notifES = new EventSource(notifUrl);
        notifES.onmessage = handleMessage;
        logger.info(`[Realtime] Subscribed to notification events for user: ${userId}`);
        
        return () => {
            if (taskES) {
                logger.info('[Realtime] Closing task subscription');
                taskES.close();
            }
            if (notifES) {
                logger.info('[Realtime] Closing notification subscription');
                notifES.close();
            }
        };
    }, [userId, projectId, handleMessage]);
};
