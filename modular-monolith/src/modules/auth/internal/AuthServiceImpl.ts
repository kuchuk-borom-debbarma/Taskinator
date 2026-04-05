import type { AuthService, StartSignUpParam, SignInParam } from '../AuthService.ts';
import { db } from '../../../database/index.ts';
import eventBus, { KAFKA_EVENTS } from '../../../utils/event-bus/index.ts';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { logger } from '../../../logger/index.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export class AuthServiceImpl implements AuthService {
    async init(): Promise<void> {
        logger.info('AuthService initialized');
    }

    async destroy(): Promise<void> {
        logger.info('AuthService destroyed');
    }

    async startSignUp(data: StartSignUpParam): Promise<void> {
        const password_hash = await Bun.password.hash(data.password_raw);
        const uid = uuidv4();

        await db
            .insertInto('pending_users')
            .values({
                id: uid,
                email: data.email,
                username: data.username,
                password_hash: password_hash,
            })
            .execute();

        logger.info(`Inserted pending user with email ${data.email}`);

        await eventBus.publish(KAFKA_EVENTS.AUTH.SIGNUP_STARTED, {
            key: uid,
            data: {
                email: data.email,
                uid: uid,
            }
        });
    }

    async finishSignUp(token: string): Promise<void> {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
            const uid = decoded.uid;

            const pendingUser = await db
                .selectFrom('pending_users')
                .where('id', '=', uid)
                .selectAll()
                .executeTakeFirst();

            if (!pendingUser) {
                throw new Error('Pending user not found');
            }

            await db
                .insertInto('users')
                .values({
                    id: pendingUser.id,
                    email: pendingUser.email,
                    username: pendingUser.username,
                    password_hash: pendingUser.password_hash,
                })
                .execute();

            logger.info(`User created with email ${pendingUser.email}`);

            await eventBus.publish(KAFKA_EVENTS.AUTH.USER_CREATED, {
                key: pendingUser.id,
                data: {
                    email: pendingUser.email,
                    uid: pendingUser.id,
                }
            });
        } catch (error) {
            logger.error('Failed to finish signup:', error);
            throw error;
        }
    }

    async signIn(data: SignInParam): Promise<{ token: string } | null> {
        const user = await db
            .selectFrom('users')
            .where('email', '=', data.email)
            .selectAll()
            .executeTakeFirst();

        if (!user) {
            logger.warn(`Sign in failed: user ${data.email} not found`);
            return null;
        }

        const isMatch = await Bun.password.verify(data.password_raw, user.password_hash);
        if (!isMatch) {
            logger.warn(`Sign in failed: invalid password for ${data.email}`);
            return null;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        logger.info(`User ${data.email} signed in successfully`);

        return { token };
    }
}
