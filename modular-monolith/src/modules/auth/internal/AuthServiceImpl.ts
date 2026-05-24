import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../infra/database';
import { logger } from '../../../infra/logger';
import type { DomainEvent } from '../../../infra/utils/event-bus';
import type {
    AuthService,
    SearchUsersParam,
    SignInParam,
    StartSignUpParam,
    User,
} from '../AuthService.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

import { sql } from 'kysely';
import {
    KAFKA_EVENTS,
    KAFKA_TOPICS,
} from '../../../infra/utils/event-bus/constants.ts';
import { claimEventsAtomic } from '../../../infra/utils/event-bus/idempotency.ts';
import { updateUserProjectCountsBulk } from './AuthQueries.ts';

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
            WITH inserted_user AS (
                INSERT INTO users (id, email, username, password_hash)
                VALUES (${uid}::uuid, ${data.email}::text, ${data.username}::text, ${password_hash}::text)
                RETURNING *
            )
            INSERT INTO outbox_events (kafka_topic, kafka_key, payload)
            SELECT ${KAFKA_TOPICS.AUTH}::text,
                   ${uid}::text,
                   jsonb_build_object(
                       'type', ${KAFKA_EVENTS.AUTH.USER_CREATED}::text,
                       'email', email,
                       'uid', id
                   )
            FROM inserted_user
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

            logger.info(`User created with email ${result.rows[0]?.email}`);
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
        logger.debug('AuthService.searchUsers called', {
            search: params.search,
            limit: params.first || params.last,
        });
        const search = params.search?.trim() ?? '';
        const { after, before } = params;
        const isBackward = !!before;
        const cursor = before || after;
        const limit = Math.min(params.first || params.last || 10, 50);

        const rows = await sql<User>`
            SELECT id, username, email, projects_count AS "projectsCount"
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

        logger.debug(`AuthService.searchUsers returned ${users.length} users`);
        return { users, nextCursor, prevCursor };
    }

    async getUsersByIds(ids: string[]): Promise<User[]> {
        logger.debug(`AuthService.getUsersByIds called for ${ids.length} ids`);
        if (ids.length === 0) return [];
        const rows = await sql<User>`
            SELECT id, username, email, projects_count AS "projectsCount"
            FROM users
            WHERE id::text = ANY(${ids}::text[])
        `.execute(db);
        return rows.rows;
    }

    async handleUserProjectCountSync(
        events: DomainEvent<{ userId: string; delta: number }>[],
    ): Promise<void> {
        if (events.length === 0) return;

        await db.transaction().execute(async (trx) => {
            const unprocessed = await claimEventsAtomic(
                trx,
                events,
                'auth-project-aggregator-group',
            );

            if (unprocessed.length === 0) return;

            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validUnprocessed = unprocessed.filter(
                (event) =>
                    event.data.userId && uuidRegex.test(event.data.userId),
            );

            if (validUnprocessed.length === 0) {
                logger.debug(
                    `[AuthService] All ${unprocessed.length} project count events skipped (no valid UUID userIds found)`,
                );
                return;
            }

            const consolidates = new Map<string, number>();
            for (const event of validUnprocessed) {
                const { userId, delta } = event.data;
                logger.debug(
                    `[AuthService] Aggregating project count for user ${userId}: delta ${delta}`,
                );
                consolidates.set(
                    userId,
                    (consolidates.get(userId) || 0) + delta,
                );
            }

            logger.info(
                `[AuthService] Performing bulk projects_count update for ${consolidates.size} users (from ${validUnprocessed.length} events)`,
            );

            await updateUserProjectCountsBulk(consolidates, trx);
        });
    }
}
