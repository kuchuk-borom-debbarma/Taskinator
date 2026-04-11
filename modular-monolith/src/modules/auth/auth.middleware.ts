import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export interface AuthRequest extends Request {
    userId?: string;
}

export const requireAuth = (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): void => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token as string;
    }

    if (!token) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as {
            id: string;
            email: string;
            username: string;
        };
        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error('[REST] Auth middleware error:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
