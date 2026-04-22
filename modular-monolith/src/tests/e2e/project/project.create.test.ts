import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { ProjectEvents_BatchAggregator } from '../../../kafka/smart-aggregator-consumer/project/ProjectEvents_BatchAggregator.ts';
import { ProjectAggregated_ChangeUserProjectCount } from '../../../modules/auth/internal/listeners/ProjectAggregated_ChangeUserProjectCount.ts';
import eventBus from '../../../utils/EventBus.ts';
import {
    startOutboxRelay,
    stopOutboxRelay,
} from '../../../utils/event-bus/OutboxRelay.ts';
import { gqlRequest } from '../helpers/request.ts';
import { CREATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Creation Deep Verification E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;

    beforeAll(async () => {
        // [1] Initialize infrastructure and background components
        await eventBus.init();

        const projectAggregator = new ProjectEvents_BatchAggregator();
        const authProjectListener =
            new ProjectAggregated_ChangeUserProjectCount();

        await projectAggregator.init();
        await authProjectListener.init();

        startOutboxRelay();
    });

    afterAll(async () => {
        // [2] Cleanup
        stopOutboxRelay();
        await eventBus.destroy();
    });

    beforeEach(async () => {
        await cleanupDb();

        const res1 = await db
            .insertInto('users')
            .values({
                email: 'creator@example.com',
                username: 'creator_user',
                password_hash: 'a',
                projects_count: 0,
            })
            .returning(['id', 'username', 'email'])
            .executeTakeFirstOrThrow();

        user1 = res1;
        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );
    });

    it('should create a project and verify background propagation to user counters', async () => {
        // [1] Initial State Check
        const initialUser = await db
            .selectFrom('users')
            .select('projects_count')
            .where('id', '=', user1.id)
            .executeTakeFirstOrThrow();
        expect(initialUser.projects_count).toBe(0);

        // [2] Execute Project Creation
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: {
                name: 'System Test Project',
                description: 'Verifying full background flow',
            },
            token: token1,
        });

        expect(createRes.status).toBe(200);

        // [3] Wait for Background Processing
        // Flow: Project (Outbox) -> Relay -> Kafka -> Aggregator (Outbox) -> Relay -> Kafka -> Listener -> User Table
        let finalCount = 0;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            const user = await db
                .selectFrom('users')
                .select('projects_count')
                .where('id', '=', user1.id)
                .executeTakeFirstOrThrow();

            finalCount = user.projects_count;
            if (finalCount > 0) break;

            await new Promise((r) => setTimeout(r, 500));
            attempts++;
        }

        expect(finalCount).toBe(1);
    }, 15000);

    it('should eventually clear the outbox after processing', async () => {
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Relay Cleanup Project' },
            token: token1,
        });

        // Wait for relay to process
        await new Promise((r) => setTimeout(r, 1000));

        const pending = await db
            .selectFrom('outbox_events')
            .select(db.fn.count('id').as('count'))
            .where('status', '=', 'PENDING')
            .executeTakeFirstOrThrow();

        // Should eventually be 0 (or at least the ones we just created should be gone)
        expect(Number(pending.count)).toBe(0);
    });
});
