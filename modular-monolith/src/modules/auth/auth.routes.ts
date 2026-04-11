import { Router } from 'express';
import type { Response } from 'express';
import { authService } from './index.ts';
import { requireAuth } from './auth.middleware.ts';

const router = Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        if (!email || !username || !password) {
            res.status(400).json({ error: 'Email, username, and password are required' });
            return;
        }
        await authService.startSignUp({ email, username, password_raw: password });
        res.status(202).json({ message: 'Signup started, check your email to verify' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/finish-sign-up', async (req, res) => {
    try {
        const token = req.query.token as string;
        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }
        await authService.finishSignUp(token);
        res.status(201).json({ message: 'Signup finished successfully. You can now login.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const result = await authService.signIn({ email, password_raw: password });
        if (!result) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        res.status(200).json({ token: result.token });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /auth/users?search=&cursor=&limit=20
 * Exact match on username or user id. Cursor-paginated.
 */
router.get('/users', requireAuth as any, async (req: any, res: Response) => {
    try {
        const search = req.query.search as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const limit  = parseInt(req.query.limit as string) || 20;

        const result = await authService.searchUsers({ 
            search, 
            cursor, 
            limit,
            actorId: req.userId
        });
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[REST] Error searching users:', error);
        res.status(400).json({ error: error.message });
    }
});

export default router;
