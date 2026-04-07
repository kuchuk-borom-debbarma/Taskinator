import { Router } from 'express';
import type { Response } from 'express';
import { taskService } from './index';
import { requireAuth } from '../auth/auth.middleware.ts';

const router = Router();

router.use(requireAuth as any);

// Get Tasks
router.get('/', async (req: any, res: Response) => {
    try {
        const { projectId } = req.query;
        const userId = req.userId;
        if (!projectId)
            throw new Error('projectId is required');
        const tasks = await taskService.getTasks(
            userId as string,
            projectId as string,
        );
        res.status(200).json(tasks);
    } catch (error: any) {
        console.error('[REST] Error fetching tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Task
router.post('/', async (req: any, res: Response) => {
    try {
        const {
            projectId,
            title,
            description,
            teamId,
            memberId,
            parentTaskId,
            initialStatus,
        } = req.body;
        const userId = req.userId;
        const result = await taskService.createTask({
            userId,
            projectId,
            title,
            description,
            teamId,
            memberId,
            parentTaskId,
            initialStatus,
        });
        res.status(201).json(result);
    } catch (error: any) {
        console.error('[REST] Error creating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update Tasks (Batch)
router.patch('/', async (req: any, res: Response) => {
    try {
        const { projectId, tasks } = req.body;
        const userId = req.userId;
        const result = await taskService.updateTasks({
            userId,
            projectId,
            tasks,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error updating tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete Tasks
router.delete('/', async (req: any, res: Response) => {
    try {
        const { projectId, taskIds } = req.body;
        const userId = req.userId;
        const result = await taskService.deleteTask({
            userId,
            projectId,
            taskIds,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error deleting tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
