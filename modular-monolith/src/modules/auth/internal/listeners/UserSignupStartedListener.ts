import eventBus, { KAFKA_EVENTS } from '../../../../utils/event-bus/index.ts';
import { externalNotificationService } from '../../../external-notification';
import jwt from 'jsonwebtoken';
import { logger } from '../../../../logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export class UserSignupStartedListener {
    async init() {
        await eventBus.subscribe('auth-signup-group', {
            [KAFKA_EVENTS.AUTH.SIGNUP_STARTED]: async (data) => {
                const { email, uid } = data;
                logger.info(
                    `[Auth Service] Processing signup for email: ${email}`,
                );

                // Generate token with UID
                const token = jwt.sign({ uid }, JWT_SECRET, {
                    expiresIn: '1h',
                });
                const link = `http://localhost:3000/auth/finish-sign-up?token=${token}`;

                await externalNotificationService.sendSignUpEmail(email, link);
            },
        });
        logger.info('[Auth Service] UserSignupStartedListener started');
    }

    async stop() {}
}

export const userSignupStartedListener = new UserSignupStartedListener();
