/**
 * @file defaultResolvers.ts
 * @description Standard resolvers for the Action Engine (parent, project, etc).
 */

import { db } from '../../../database/index.js';
import type { AsyncResolverRegistry } from './AsyncResolverRegistry.js';
import { ContextualEntity } from './ContextualEntity.js';

/**
 * Registers all standard resolvers for the project.
 */
export function registerDefaultResolvers(
    registry: AsyncResolverRegistry,
): void {
    // 1. Task -> Parent
    registry.register('project_task', 'parent', async (self) => {
        const parentId = self.get('parent_id'); // This assumes parent_id exists in schema or via link
        // In Taskinator-v2, parent/child relationships are usually in task_reachability or task_link.
        // For simplicity in this phase, we look for a 'parent_id' column if it exists,
        // or a direct link.

        // Let's check for a direct incoming 'blocks' or similar link if parent_id is missing.
        if (!parentId) {
            const link = await db
                .selectFrom('task_link')
                .select('source_task_id')
                .where('target_task_id', '=', self.id as any)
                .where('label', '=', 'parent') // assuming 'parent' label for hierarchy
                .executeTakeFirst();

            if (!link) throw new Error(`Parent not found for task ${self.id}`);
            return fetchEntity(
                registry,
                'project_task',
                link.source_task_id as string,
            );
        }

        return fetchEntity(registry, 'project_task', parentId);
    });

    // 2. Task -> Project
    registry.register('project_task', 'project', async (self) => {
        const projectId = self.get('fk_project_id');
        if (!projectId)
            throw new Error(`Project ID missing for task ${self.id}`);
        return fetchEntity(registry, 'project', projectId);
    });

    // 3. Team -> Project
    registry.register('project_team', 'project', async (self) => {
        const projectId = self.get('fk_project_id');
        if (!projectId)
            throw new Error(`Project ID missing for team ${self.id}`);
        return fetchEntity(registry, 'project', projectId);
    });

    // 4. Task -> Team
    registry.register('project_task', 'team', async (self) => {
        const teamId = self.get('fk_team_id');
        if (!teamId) throw new Error(`Team ID missing for task ${self.id}`);
        return fetchEntity(registry, 'project_team', teamId);
    });
}

/**
 * Helper to fetch a raw record and wrap it in a ContextualEntity.
 */
async function fetchEntity(
    registry: AsyncResolverRegistry,
    type: any,
    id: string,
): Promise<ContextualEntity> {
    const data = await db
        .selectFrom(type)
        .selectAll()
        .where('id', '=', id as any)
        .executeTakeFirst();
    if (!data) throw new Error(`${type} with ID ${id} not found`);
    return new ContextualEntity(type, id, data as any, registry);
}
