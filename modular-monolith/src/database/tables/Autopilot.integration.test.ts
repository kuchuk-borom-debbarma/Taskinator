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
            name: 'Test Autopilot',
            description: 'Integration test autopilot',
            triggers: JSON.stringify([]),
            steps: JSON.stringify([
                { type: 'condition', id: 'hash1' },
                { type: 'action', id: 'hash2' },
            ]),
            created_by: 'user-1',
            updated_by: 'user-1',
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
        expect(result?.name).toEqual('Test Autopilot');

        // Kysely with JSONColumnType might return the object directly or string depending on dialect/setup.
        // In our setup with JSONColumnType, it should be parsed.
        const steps =
            typeof result?.steps === 'string'
                ? JSON.parse(result.steps)
                : result?.steps;

        expect(steps[0].type).toBe('condition');
    });
});
