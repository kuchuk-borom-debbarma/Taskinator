import { Router } from 'express';
import { taskService } from '../../services/task';

const router = Router();

// Get Tasks
router.get('/', async (req, res) => {
    try {
        const { userId, projectId } = req.query;
        if (!userId || !projectId) throw new Error('userId and projectId are required');
        const tasks = await taskService.getTasks(userId as string, projectId as string);
        res.status(200).json(tasks);
    } catch (error: any) {
        console.error('[REST] Error fetching tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Task
router.post('/', async (req, res) => {
    console.log('[REST] POST /tasks request body:', JSON.stringify(req.body, null, 2));
    try {
        const { userId, projectId, title, description, teamId, memberId, parentTaskId, initialStatus } = req.body;
        const result = await taskService.createTask({
            userId,
            projectId,
            title,
            description,
            teamId,
            memberId,
            parentTaskId,
            initialStatus
        });
        res.status(201).json(result);
    } catch (error: any) {
        console.error('[REST] Error creating task:', error);
        res.status(400).json({ error: error.message });
    }
});

// Update Tasks (Batch)
router.patch('/', async (req, res) => {
    console.log('[REST] PATCH /tasks request body:', JSON.stringify(req.body, null, 2));
    try {
        const { userId, projectId, tasks } = req.body;
        const result = await taskService.updateTasks({ userId, projectId, tasks });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error updating tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete Tasks
router.delete('/', async (req, res) => {
    console.log('[REST] DELETE /tasks request body:', JSON.stringify(req.body, null, 2));
    try {
        const { userId, projectId, taskIds } = req.body;
        const result = await taskService.deleteTask({ userId, projectId, taskIds });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error deleting tasks:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
