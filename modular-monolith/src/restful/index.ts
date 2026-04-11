import express from 'express';
import cors from 'cors';
import projectRoutes from '../modules/project/project.routes';
import teamRoutes from '../modules/team/team.routes';
import taskRoutes from '../modules/task/task.routes';
import authRoutes from '../modules/auth/auth.routes.ts';
import notificationRoutes from '../modules/internal-notification/internal-notification.routes.ts';
import realtimeRoutes from '../modules/realtime/realtime.routes.ts';
import { yoga } from '../graphql';

/**
 * startRestServer initializes the Express application and routes.
 * It returns a Promise that resolves once the server is actually listening on the port.
 */
export const startRestServer = (port: number = 3000): Promise<express.Application> => {
    return new Promise((resolve) => {
        const app = express();

        app.use(cors());
        app.use(express.json());

        // Request Logger
        app.use((req, _res, next) => {
            console.log(
                `[REST] ${new Date().toISOString()} - ${req.method} ${req.url}`,
            );
            next();
        });

        // Root Health Check
        app.get('/health', (req, res) => {
            console.log('[REST] Health check requested');
            res.json({ status: 'UP', timestamp: new Date().toISOString() });
        });

        // Domain Routes
        app.use('/projects', projectRoutes);
        app.use('/teams', teamRoutes);
        app.use('/tasks', taskRoutes);
        app.use('/auth', authRoutes);
        app.use('/notifications', notificationRoutes);
        app.use('/realtime', realtimeRoutes);
        app.use('/graphql', (req, res) => yoga(req, res));

        const server = app.listen(port, () => {
            console.log(`[REST] Server started on http://localhost:${port}`);
            resolve(app);
        });
    });
};
