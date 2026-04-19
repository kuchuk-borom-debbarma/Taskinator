import { Router } from 'express';
import type { Response } from 'express';
import { projectService } from './index';
import { requireAuth } from '../auth/auth.middleware.ts';
import type { AuthRequest } from '../auth/auth.middleware.ts';

const router = Router();

router.use(requireAuth as any);

// Get Projects
router.get('/', async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const cursor = req.query.cursor as string | undefined;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await projectService.getProjectsOfUser(
            userId as string,
            {
                after: cursor,
                first: limit,
            },
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error fetching projects:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get Project
router.get('/:projectId', async (req: any, res: Response): Promise<void> => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
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
router.get('/:projectId/members', async (req: any, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.userId;
        const cursor = req.query.cursor as string | undefined;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await projectService.getProjectMembers(
            userId as string,
            projectId,
            { after: cursor, first: limit },
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error fetching project members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Search Project Members
router.get('/:projectId/members/search', async (req: any, res: Response) => {
    try {
        const { projectId } = req.params;
        const actorId = req.userId;
        const search = req.query.search as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await projectService.searchProjectMembers({
            actorId: actorId as string,
            projectId,
            search,
            after: cursor,
            first: limit,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error searching project members:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
