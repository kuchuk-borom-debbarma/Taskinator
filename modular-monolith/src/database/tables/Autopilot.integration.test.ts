import { afterAll, describe, expect, it } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { db, pool } from '../index.ts';

describe('Autopilot Table Integration', () => {
    afterAll(async () => {
        await pool.end();
    });

    it('should insert and retrieve an autopilot definition', async () => {
        const projectId = uuidv4();
        const autopilotId = uuidv4();

        const newAutopilot = {
            id: autopilotId,
            fk_project_id: projectId,
            triggers: ['TASK_CREATED'],
            conditions: JSON.stringify({
                type: 'predicate',
                domain: 'task',
                field: 'status',
                operator: 'eq',
                value: 'DONE',
            }),
            is_active: true,
            trace_history_enabled: false,
            version: 1,
        };

        await db.insertInto('autopilot').values(newAutopilot).execute();

        const result = await db
            .selectFrom('autopilot')
            .selectAll()
            .where('id', '=', autopilotId)
            .executeTakeFirst();

        expect(result).toBeDefined();
        expect(result?.fk_project_id).toBe(projectId);
        expect(result?.triggers).toEqual(['TASK_CREATED']);

        // Kysely with JSONColumnType might return the object directly or string depending on dialect/setup.
        // In our setup with JSONColumnType, it should be parsed.
        const conditions =
            typeof result?.conditions === 'string'
                ? JSON.parse(result.conditions)
                : result?.conditions;

        expect(conditions.type).toBe('predicate');
    });
});
