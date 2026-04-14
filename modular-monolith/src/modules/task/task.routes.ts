import { Router } from 'express';
import type { Response } from 'express';
import { taskService } from './index';
import { requireAuth } from '../auth/auth.middleware.ts';
import { automationService } from '../automation';

const router = Router();

router.use(requireAuth as any);

// Get Tasks
router.get('/', async (req: any, res: Response) => {
    try {
        const { projectId, cursor, limit } = req.query;
        const userId = req.userId;
        if (!projectId) {
            res.status(400).json({ error: 'projectId is required' });
            return;
        }

        const result = await taskService.getTasks(userId, projectId as string, { 
            cursor: cursor as string, 
            limit: parseInt(limit as string) || 20 
        });
        res.status(200).json(result);
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

// Task Automations
router.get('/:taskId/automations', async (req: any, res: Response) => {
    try {
        const { taskId } = req.params;
        const { cursor, limit } = req.query;
        const result = await automationService.getAutomationsByFilter({
            taskId,
            cursor: cursor as string,
            limit: parseInt(limit as string) || 20,
        });
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/:taskId/automations', async (req: any, res: Response) => {
    try {
        const { taskId } = req.params;
        const { projectId, targetScope, rules, isActive } = req.body;
        const userId = req.userId;
        const automation = await automationService.addAutomation({
            userId,
            projectId,
            targetScope: targetScope || 'TASK',
            taskId,
            rules,
            isActive
        });
        res.status(201).json(automation);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.delete('/:taskId/automations/:automationId', async (req: any, res: Response) => {
    try {
        const { automationId } = req.params;
        const userId = req.userId;
        await automationService.deleteAutomation({ userId, automationId });
        res.status(200).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
