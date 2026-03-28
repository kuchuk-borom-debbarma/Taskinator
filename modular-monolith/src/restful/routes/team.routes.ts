import { Router } from 'express';
import { teamService } from '../../services/team';

const router = Router();

// Create Teams
router.post('/', async (req, res) => {
    try {
        const { userId, projectId, teams } = req.body;
        const result = await teamService.createTeams({ userId, projectId, teams });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete Teams
router.delete('/', async (req, res) => {
    try {
        const { userId, projectId, teamIds } = req.body;
        const result = await teamService.deleteTeams({ userId, projectId, teamIds });
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Add Team Members
router.post('/:teamId/members', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, projectId, members } = req.body;
        const result = await teamService.addTeamMembers({ userId, projectId, teamId, members });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete Team Members
router.delete('/:teamId/members', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, projectId, members } = req.body;
        const result = await teamService.deleteTeamMembers({ userId, projectId, teamId, members });
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
