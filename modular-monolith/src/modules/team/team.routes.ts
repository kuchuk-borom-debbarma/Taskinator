import { Router } from 'express';
import type { Response } from 'express';
import { teamService } from './index';
import { requireAuth } from '../auth/auth.middleware.ts';

const router = Router();

router.use(requireAuth as any);

// Get Teams
router.get('/', async (req: any, res: Response) => {
    try {
        const { projectId, cursor, limit } = req.query;
        const userId = req.userId;
        if (!projectId) throw new Error('projectId is required');
        const result = await teamService.getTeams(
            userId as string,
            projectId as string,
            {
                after: cursor as string,
                first: parseInt(limit as string) || 20,
            },
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error fetching teams:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get Team Members
router.get('/:teamId/members', async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;
        const { projectId, cursor, limit } = req.query;
        const userId = req.userId;
        if (!projectId) throw new Error('projectId is required');
        const result = await teamService.getTeamMembers(
            userId as string,
            projectId as string,
            teamId,
            {
                after: cursor as string,
                first: parseInt(limit as string) || 20,
            },
        );
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error fetching team members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Search users who are members of a team — exact match on username or user id
// GET /teams/:teamId/users/search?projectId=&search=&cursor=&limit=
router.get('/:teamId/users/search', async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;
        const { projectId, search, cursor, limit } = req.query;
        const actorId = req.userId as string;
        if (!projectId) throw new Error('projectId is required');

        const result = await teamService.searchTeamUsers({
            actorId,
            projectId: projectId as string,
            teamId,
            search: search as string | undefined,
            after: cursor as string | undefined,
            first: parseInt(limit as string) || 20,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error searching team users:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Teams
router.post('/', async (req: any, res: Response) => {
    try {
        const { projectId, teams } = req.body;
        const userId = req.userId;
        const result = await teamService.createTeams({
            userId,
            projectId,
            teams,
        });
        res.status(201).json(result);
    } catch (error: any) {
        console.error('[REST] Error creating teams:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete Teams
router.delete('/', async (req: any, res: Response) => {
    try {
        const { projectId, teamIds } = req.body;
        const userId = req.userId;
        const result = await teamService.deleteTeams({
            userId,
            projectId,
            teamIds,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error deleting teams:', error);
        res.status(400).json({ error: error.message });
    }
});

// Add Team Members
router.post('/:teamId/members', async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;
        const { projectId, members } = req.body;
        const userId = req.userId;
        const result = await teamService.addTeamMembers({
            userId,
            projectId,
            teamId,
            members,
        });
        res.status(201).json(members);
    } catch (error: any) {
        console.error('[REST] Error adding team members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete Team Members
router.delete('/:teamId/members', async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;
        const { projectId, members } = req.body;
        const userId = req.userId;
        const result = await teamService.deleteTeamMembers({
            userId,
            projectId,
            teamId,
            members,
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error deleting team members:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
