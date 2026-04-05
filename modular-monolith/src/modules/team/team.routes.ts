import { Router } from 'express';
import { teamService } from './index';

const router = Router();

// Get Teams
router.get('/', async (req, res) => {
    try {
        const { userId, projectId } = req.query;
        if (!userId || !projectId)
            throw new Error('userId and projectId are required');
        const teams = await teamService.getTeams(
            userId as string,
            projectId as string,
        );
        res.status(200).json(teams);
    } catch (error: any) {
        console.error('[REST] Error fetching teams:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get Team Members
router.get('/:teamId/members', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, projectId } = req.query;
        if (!userId || !projectId)
            throw new Error('userId and projectId are required');
        const members = await teamService.getTeamMembers(
            userId as string,
            projectId as string,
            teamId,
        );
        res.status(200).json(members);
    } catch (error: any) {
        console.error('[REST] Error fetching team members:', error);
        res.status(400).json({ error: error.message });
    }
});

// Create Teams
router.post('/', async (req, res) => {
    console.log(
        '[REST] POST /teams request body:',
        JSON.stringify(req.body, null, 2),
    );
    try {
        const { userId, projectId, teams } = req.body;
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
router.delete('/', async (req, res) => {
    try {
        const { userId, projectId, teamIds } = req.body;
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
router.post('/:teamId/members', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, projectId, members } = req.body;
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
router.delete('/:teamId/members', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId, projectId, members } = req.body;
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
