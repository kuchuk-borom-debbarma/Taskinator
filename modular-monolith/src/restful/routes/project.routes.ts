import { Router } from 'express';
import { projectService } from '../../services/project';

const router = Router();

// Create Project
router.post('/', async (req, res) => {
    try {
        const { name, description, userId } = req.body;
        const project = await projectService.createProject({ name, description, userId });
        res.status(201).json(project);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete Projects
router.delete('/', async (req, res) => {
    try {
        const { userId, projectIds } = req.body;
        await projectService.deleteProjects({ userId, projectIds });
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Add Members
router.post('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, usersToAdd } = req.body;
        const members = await projectService.addProjectMembers({ projectId, userId, usersToAdd });
        res.status(201).json(members);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Remove Members
router.delete('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, memberIds } = req.body;
        await projectService.deleteProjectMembers({ projectId, userId, memberIds });
        res.status(204).send();
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
