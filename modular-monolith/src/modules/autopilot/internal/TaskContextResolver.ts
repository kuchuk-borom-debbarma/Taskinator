import { taskService } from '../../task/index.ts';
import type { DomainContextResolver } from './ContextService';

export class TaskContextResolver implements DomainContextResolver {
    async resolve(id: string): Promise<Record<string, any> | null> {
        const tasks = await taskService.getTasksByIds([id]);
        return tasks[0] ?? null;
    }
}
