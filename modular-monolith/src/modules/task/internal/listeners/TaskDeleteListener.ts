export class TaskDeleteListener {
    async init() {
        // Legacy recursive cleanup via materialized_path is disabled.
        // Task links are now managed via DAG (task_link) with ON DELETE CASCADE.
        console.log('[Task Service] TaskDeleteListener initialized (Cleanup logic disabled)');
    }

    async stop() {}
}

export const taskDeleteListener = new TaskDeleteListener();
