import { Router } from 'express';
import { projectService } from '../../services/project';

const router = Router();

// Get Projects
router.get('/', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) throw new Error('userId is required');
        const projects = await projectService.getProjects(userId as string);
        res.status(200).json(projects);
    } catch (error: any) {
        console.error('[REST] Error fetching projects:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get Project
router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.query;
        if (!userId) throw new Error('userId is required');
        const project = await projectService.getProject(
            userId as string,
            projectId,
        );
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.status(200).json(project);
    } catch (error: any) {
        console.error('[REST] Error fetching project:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get Project Members
router.get('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId } = req.query;
        if (!userId) throw new Error('userId is required');
        const members = await projectService.getProjectMembers(userId as string, projectId);
        res.status(200).json(members);
    } catch (error: any) {
        console.error('[REST] Error fetching project members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Project
router.post('/', async (req, res) => {
    try {
        const { name, description, userId } = req.body;
        const project = await projectService.createProject({
            name,
            description,
            userId,
        });
        res.status(201).json(project);
    } catch (error: any) {
        console.error('[REST] Error creating project:', error);
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
        console.error('[REST] Error deleting projects:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add Members
router.post('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, usersToAdd } = req.body;
        const members = await projectService.addProjectMembers({
            projectId,
            userId,
            usersToAdd,
        });
        res.status(201).json(members);
    } catch (error: any) {
        console.error('[REST] Error adding members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Remove Members
router.delete('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { userId, memberIds } = req.body;
        await projectService.deleteProjectMembers({
            projectId,
            userId,
            memberIds,
        });
        res.status(204).send();
    } catch (error: any) {
        console.error('[REST] Error removing members:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
