import eventBus, { KAFKA_EVENTS } from '../../../../utils/event-bus/index.ts';
import { db } from '../../../../database/index.ts';
import { logger } from '../../../../logger/index.ts';

export class UserCreatedListener {
    async init() {
        await eventBus.subscribe('auth-user-created-group', {
            [KAFKA_EVENTS.AUTH.USER_CREATED]: async (data) => {
                const { email } = data;
                logger.info(
                    `[Auth Service] Cleaning up pending user for email: ${email}`,
                );

                await db
                    .deleteFrom('pending_users')
                    .where('email', '=', email)
                    .execute();

                logger.info(
                    `[Auth Service] Successfully removed ${email} from pending_users`,
                );
            },
        });
        logger.info('[Auth Service] UserCreatedListener started');
    }

    async stop() {}
}

export const userCreatedListener = new UserCreatedListener();
