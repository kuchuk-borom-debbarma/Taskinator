import { Router } from 'express';
import type { Response } from 'express';
import { requireAuth, type AuthRequest } from '../auth/auth.middleware.ts';
import { sseManager } from '../../utils/SSEManager.ts';
import { projectService } from '../project/index.ts';
import { logger } from '../../logger';

const router = Router();

/**
 * GET /api/v1/realtime/stream?token=JWT
 * 
 * The main entry point for real-time updates. 
 * Establishes a persistent SSE connection for the authenticated user.
 */
router.get('/stream', requireAuth as any, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        
        // 1. Fetch user projects to enable project-scoped filtering/routing in SSEManager
        // This is done once on connect to avoid DB overhead during push events.
        const projectIds = await projectService.getUserProjectIds(userId);
        
        // 2. Promotion to SSE
        sseManager.addConnection(userId, projectIds, res);
        
        logger.info(`[Realtime] Stream established for user ${userId} in ${projectIds.length} projects`);
        
    } catch (error: any) {
        logger.error('[Realtime] Failed to establish SSE stream:', error);
        res.status(500).json({ error: 'Failed to establish real-time stream' });
    }
});

export default router;
