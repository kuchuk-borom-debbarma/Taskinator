import type {
    AuthService,
    StartSignUpParam,
    SignInParam,
    SearchUsersParam,
    User,
} from '../AuthService.ts';
import { db } from '../../../database';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { logger } from '../../../logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

import { sql } from 'kysely';
import {
    KAFKA_TOPICS,
    KAFKA_EVENTS,
} from '../../../utils/event-bus/constants.ts';

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
            SELECT ${KAFKA_TOPICS.AUTH},
                   ${uid}::text,
                   jsonb_build_object(
                       'type', ${KAFKA_EVENTS.AUTH.SIGNUP_STARTED},
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
                    SELECT ${KAFKA_TOPICS.AUTH},
                           id::text,
                           jsonb_build_object(
                               'type', ${KAFKA_EVENTS.AUTH.USER_CREATED},
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

    async searchUsers(params: SearchUsersParam): Promise<{
        users: User[];
        nextCursor: string | null;
        prevCursor: string | null;
    }> {
        const search = params.search?.trim() ?? '';
        const { after, before } = params;
        const isBackward = !!before;
        const cursor = before || after;
        const limit = Math.min(params.first || params.last || 10, 50);

        const rows = await sql<User>`
            SELECT id, username, email
            FROM users
            WHERE
                (
                    ${search} = ''
                    OR username = ${search}
                    OR id::text = ${search}
                )
                AND (
                    ${cursor}::uuid IS NULL
                    OR (
                        CASE 
                          WHEN ${isBackward} THEN id < ${cursor}::uuid
                          ELSE id > ${cursor}::uuid
                        END
                    )
                )
                ${params.actorId ? sql`AND id <> ${params.actorId}::uuid` : sql``}
            ORDER BY id ${sql.raw(isBackward ? 'DESC' : 'ASC')}
            LIMIT ${limit + 1}
        `.execute(db);

        let resultRows = rows.rows;
        const hasMore = resultRows.length > limit;
        if (hasMore) {
            resultRows = resultRows.slice(0, limit);
        }
        if (isBackward) {
            resultRows.reverse();
        }

        const users = resultRows;
        let nextCursor: string | null = null;
        let prevCursor: string | null = null;

        if (users.length > 0) {
            const first = users[0]!;
            const last = users[users.length - 1]!;

            if (isBackward) {
                nextCursor = last.id;
                prevCursor = hasMore ? first.id : null;
            } else {
                nextCursor = hasMore ? last.id : null;
                prevCursor = after ? first.id : null;
            }
        }

        return { users, nextCursor, prevCursor };
    }

    async getUsersByIds(ids: string[]): Promise<User[]> {
        if (ids.length === 0) return [];
        const rows = await sql<User>`
            SELECT id, username, email
            FROM users
            WHERE id::text = ANY(${ids}::text[])
        `.execute(db);
        return rows.rows;
    }
}
