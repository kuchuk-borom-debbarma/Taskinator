import { Router } from 'express';
import { authService } from '../../services/auth/index.ts';

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

export default router;
