import express from 'express';
import cors from 'cors';
import projectRoutes from './routes/project.routes';
import teamRoutes from './routes/team.routes';
import taskRoutes from './routes/task.routes';

export const startRestServer = (port: number = 3000) => {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Request Logger
    app.use((req, _res, next) => {
        console.log(`[REST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
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

    app.listen(port, () => {
        console.log(`[REST] Server started on http://localhost:${port}`);
    });

    return app;
};
