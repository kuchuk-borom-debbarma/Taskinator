import type {
    AuthService,
    StartSignUpParam,
    SignInParam,
} from '../AuthService.ts';
import { db } from '../../../database';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { logger } from '../../../logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

import { sql } from 'kysely';

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

        await sql`
            WITH inserted_pending AS (
                INSERT INTO pending_users (id, email, username, password_hash)
                VALUES (${uid}::uuid, ${data.email}, ${data.username}, ${password_hash})
                RETURNING *
            )
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT 'auth.signup.started',
                   ${uid}::text,
                   jsonb_build_object(
                       'email', email,
                       'uid', id
                   )
            FROM inserted_pending
        `.execute(db);

        logger.info(`Inserted pending user with email ${data.email}`);
    }

    async finishSignUp(token: string): Promise<void> {
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { uid: string };
            const uid = decoded.uid;

            const result = await sql<{ email: string }>`
                WITH pending AS (
                    SELECT * FROM pending_users WHERE id = ${uid}::uuid
                ),
                inserted_user AS (
                    INSERT INTO users (id, email, username, password_hash)
                    SELECT id, email, username, password_hash FROM pending
                    RETURNING *
                ),
                inserted_outbox AS (
                    INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
                    SELECT 'auth.user.created',
                           id::text,
                           jsonb_build_object(
                               'email', email,
                               'uid', id
                           )
                    FROM inserted_user
                )
                SELECT email FROM inserted_user
            `.execute(db);

            if (result.rows.length === 0) {
                throw new Error('Pending user not found');
            }

            logger.info(`User created with email ${result.rows[0]!.email}`);
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

        const isMatch = await Bun.password.verify(
            data.password_raw,
            user.password_hash,
        );
        if (!isMatch) {
            logger.warn(`Sign in failed: invalid password for ${data.email}`);
            return null;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' },
        );

        logger.info(`User ${data.email} signed in successfully`);

        return { token };
    }
}
