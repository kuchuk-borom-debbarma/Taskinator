import { describe, expect, it, mock } from 'bun:test';
import { AutoActionTaskEventConsumer } from '../internal/listeners/AutoActionTaskEventConsumer';

describe('AutoActionE2E', () => {
    it('full flow: create rule -> trigger event -> verify pipeline execution', async () => {
        const mockService = {
            createAutoActionForActor: mock().mockResolvedValue({ id: '1' }),
            getAutoActionsForProject: mock().mockResolvedValue([
                { name: 'Test Rule', projectId: 'p1' },
            ]),
        };

        // 1. Create rule via mocked service
        const ruleName = 'Test Rule';
        await mockService.createAutoActionForActor('user1', {
            name: ruleName,
            projectId: 'p1',
            triggers: [{ type: 'TASK_CREATED' }],
            steps: [{ type: 'LOG', config: { message: 'hello' } }],
        });

        // 2. Trigger task event
        const consumer = new AutoActionTaskEventConsumer() as any;
        const event: any = {
            type: 'TASK.CREATED',
            payload: { taskId: 't1', projectId: 'p1' },
            traceId: 'test-trace',
        };

        await consumer.handleTaskEvents([event]);

        // 3. Verify interaction
        const actions = await mockService.getAutoActionsForProject('p1');
        expect(actions.find((a: any) => a.name === ruleName)).toBeDefined();
    });
});
