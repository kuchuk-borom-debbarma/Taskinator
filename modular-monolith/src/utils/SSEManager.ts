import type { Request, Response } from 'express';
import { logger } from '../logger';

/**
 * SSEManager handles the persistence, heartbeat, and cleanup
 * of 10,000+ concurrent Server-Sent Event connections.
 * It supports broadcasting to specific users or entire projects.
 */
export class SSEManager {
    private static instance: SSEManager;

    // Registry: userId -> Set of active Response objects (for multi-tab support)
    private userRegistry = new Map<string, Set<Response>>();

    // Project Fan-out Index: projectId -> Set of User IDs currently connected
    private projectRegistry = new Map<string, Set<string>>();

    private constructor() {
        // Start the global heartbeat interval (30s)
        setInterval(() => this.heartbeat(), 30000);
    }

    public static getInstance(): SSEManager {
        if (!SSEManager.instance) {
            SSEManager.instance = new SSEManager();
        }
        return SSEManager.instance;
    }

    /**
     * Handshake and register a new SSE connection.
     * @param userId The recipient ID
     * @param projectIds List of project IDs the user has access to (cached on connect)
     * @param req The Express request object (to tune socket)
     * @param res The Express response object
     */
    public addConnection(userId: string, projectIds: string[], req: Request, res: Response) {
        // 1. Tune the underlying socket for high-concurrency streaming
        req.socket.setKeepAlive(true, 1000);
        req.socket.setTimeout(0); // Prevents Node.js from closing idle stream
        req.socket.setNoDelay(true);

        // 2. Establish SSE Headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx)
        });

        // 3. Flush headers immediately to acknowledge connection
        res.flushHeaders();

        // 4. Register User
        if (!this.userRegistry.has(userId)) {
            this.userRegistry.set(userId, new Set());
        }
        const connections = this.userRegistry.get(userId)!;
        connections.add(res);

        // 5. Register Project Memberships (for broadcasting task updates)
        projectIds.forEach((pid) => {
            if (!this.projectRegistry.has(pid)) {
                this.projectRegistry.set(pid, new Set());
            }
            this.projectRegistry.get(pid)!.add(userId);
        });

        // 6. Initial "ok" comment to confirm stream is open
        res.write(':ok\n\n');

        logger.debug(`[SSE] Connected user: ${userId} (Total users: ${this.userRegistry.size})`);

        // 7. Cleanup on disconnect
        res.on('close', () => {
            connections.delete(res);
            
            // If No more tabs open for this user, clean up their project mappings
            if (connections.size === 0) {
                this.userRegistry.delete(userId);
                
                // Remove user from project registries
                projectIds.forEach((pid) => {
                    const projectUsers = this.projectRegistry.get(pid);
                    if (projectUsers) {
                        projectUsers.delete(userId);
                        if (projectUsers.size === 0) {
                            this.projectRegistry.delete(pid);
                        }
                    }
                });
            }
            logger.debug(`[SSE] Disconnected user: ${userId}`);
        });
    }

    /**
     * Send an event to a specific user (e.g. personal notification).
     */
    public sendToUser(userId: string, event: string, data: any) {
        const connections = this.userRegistry.get(userId);
        if (!connections || connections.size === 0) return;

        this.broadcast(connections, event, data);
    }

    /**
     * Send an event to all users who belong to a specific project (e.g. task update).
     */
    public sendToProject(projectId: string, event: string, data: any) {
        const userIds = this.projectRegistry.get(projectId);
        if (!userIds || userIds.size === 0) return;

        userIds.forEach((uid) => {
            const connections = this.userRegistry.get(uid);
            if (connections) {
                this.broadcast(connections, event, data);
            }
        });
    }

    private broadcast(connections: Set<Response>, event: string, data: any) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        connections.forEach((res) => {
            try {
                res.write(payload);
                // Optionally call res.flush() if using compression middleware
            } catch (err) {
                // Connections closed abruptly are handled by 'close' listener
            }
        });
    }

    /**
     * Periodic heartbeat comment to keep proxies (Nginx, ALB) from killing "idle" connections.
     */
    private heartbeat() {
        const payload = ':heartbeat\n\n';
        for (const connections of this.userRegistry.values()) {
            connections.forEach((res) => {
                try {
                    res.write(payload);
                } catch {
                    // Ignore, cleanup happens on 'close'
                }
            });
        }
    }
}

export const sseManager = SSEManager.getInstance();
