import { Router } from 'express';
import type { Response } from 'express';
import { internalNotificationService } from './index.ts';
import { requireAuth } from '../auth/auth.middleware.ts';

const router = Router();

router.use(requireAuth as any);

// Get Notifications
router.get('/', async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const after = req.query.cursor as string | undefined;
        const first = parseInt(req.query.limit as string) || 20;

        const result = await internalNotificationService.getNotifications(
            userId,
            { after, first },
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error fetching notifications:', error);
        res.status(400).json({ error: error.message });
    }
});

// GET /notifications/unread-count
router.get('/unread-count', async (req: any, res: Response) => {
    try {
        const userId: string = req.userId;
        const count = await internalNotificationService.getUnreadCount(userId);
        res.status(200).json({ count });
    } catch (error: any) {
        console.error('[REST] Error fetching unread count:', error);
        res.status(400).json({ error: error.message });
    }
});

// PATCH /notifications/read-all  — must be registered BEFORE /:id/read
// otherwise Express matches "read-all" as the :id param
router.patch('/read-all', async (req: any, res: Response) => {
    try {
        const userId: string = req.userId;
        await internalNotificationService.markAllAsRead(userId);
        res.status(204).send();
    } catch (error: any) {
        console.error('[REST] Error marking all notifications as read:', error);
        res.status(400).json({ error: error.message });
    }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req: any, res: Response) => {
    try {
        const userId: string = req.userId;
        const { id } = req.params;
        await internalNotificationService.markAsRead(userId, id);
        res.status(204).send();
    } catch (error: any) {
        console.error('[REST] Error marking notification as read:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
