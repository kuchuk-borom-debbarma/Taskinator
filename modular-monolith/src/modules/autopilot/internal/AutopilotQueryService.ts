import { type Kysely, sql } from 'kysely';
import type { Database } from '../../../database/index.ts';
import type { Autopilot } from '../../../database/tables/Autopilot.ts';
import type { AutopilotAction } from '../../../database/tables/AutopilotAction.ts';
import type { PaginationParams } from '../../../types/pagination.ts';
import { decodeCursor, encodeCursor } from '../../../utils/utils.ts';

export interface AutopilotWithActions extends Autopilot {
    actions: AutopilotAction[];
}

export interface AutopilotPage {
    autopilots: AutopilotWithActions[];
    totalCount: number;
    nextCursor: string | null;
    prevCursor: string | null;
}

export class AutopilotQueryService {
    constructor(private db: Kysely<Database>) {}

    async getAutopilotsByProject(
        projectId: string,
        params: PaginationParams,
    ): Promise<AutopilotPage> {
        const limit = params.first ?? params.last ?? 20;
        const isBackward = !!params.last;

        // Decode cursors
        const afterCursor = params.after ? decodeCursor(params.after) : null;
        const beforeCursor = params.before ? decodeCursor(params.before) : null;

        // 1. Count total autopilots for this project
        const countResult = await this.db
            .selectFrom('autopilot')
            .select(this.db.fn.countAll<number>().as('count'))
            .where('fk_project_id', '=', projectId)
            .executeTakeFirstOrThrow();

        const totalCount = Number(countResult.count);

        // 2. Build paginated query
        let query = this.db
            .selectFrom('autopilot')
            .selectAll()
            .where('fk_project_id', '=', projectId)
            .orderBy('created_at', isBackward ? 'desc' : 'asc')
            .orderBy('id', isBackward ? 'desc' : 'asc')
            .limit(limit + 1); // fetch one extra to detect next/prev page

        if (afterCursor) {
            query = query.where(
                sql<boolean>`(created_at, id) > (${sql.val(afterCursor.timeValue)}::timestamptz, ${sql.val(afterCursor.id)}::uuid)`,
            );
        }

        if (beforeCursor) {
            query = query.where(
                sql<boolean>`(created_at, id) < (${sql.val(beforeCursor.timeValue)}::timestamptz, ${sql.val(beforeCursor.id)}::uuid)`,
            );
        }

        let rows = await query.execute();

        // 3. Determine pagination flags
        const hasMore = rows.length > limit;
        if (hasMore) rows = rows.slice(0, limit);
        if (isBackward) rows.reverse();

        const hasNextPage = isBackward ? !!params.before : hasMore;
        const hasPreviousPage = isBackward ? hasMore : !!params.after;

        const lastRow = rows[rows.length - 1];
        const firstRow = rows[0];
        const nextCursor =
            hasNextPage && lastRow
                ? encodeCursor(lastRow.created_at.toISOString(), lastRow.id)
                : null;
        const prevCursor =
            hasPreviousPage && firstRow
                ? encodeCursor(firstRow.created_at.toISOString(), firstRow.id)
                : null;

        // 4. Batch-load all actions for these autopilots
        const autopilotIds = rows.map((a) => a.id);
        const actions =
            autopilotIds.length > 0
                ? await this.db
                      .selectFrom('autopilot_action')
                      .selectAll()
                      .where('fk_autopilot_id', 'in', autopilotIds)
                      .orderBy('position', 'asc')
                      .execute()
                : [];

        // 5. Group actions by autopilot ID
        const actionsByAutopilotId = new Map<string, AutopilotAction[]>();
        for (const action of actions) {
            const list = actionsByAutopilotId.get(action.fk_autopilot_id) ?? [];
            list.push(action);
            actionsByAutopilotId.set(action.fk_autopilot_id, list);
        }

        const autopilots: AutopilotWithActions[] = rows.map((a) => ({
            ...a,
            actions: actionsByAutopilotId.get(a.id) ?? [],
        }));

        return { autopilots, totalCount, nextCursor, prevCursor };
    }

    async getAutopilotById(id: string): Promise<AutopilotWithActions | null> {
        const autopilot = await this.db
            .selectFrom('autopilot')
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst();

        if (!autopilot) return null;

        const actions = await this.db
            .selectFrom('autopilot_action')
            .selectAll()
            .where('fk_autopilot_id', '=', id)
            .orderBy('position', 'asc')
            .execute();

        return {
            ...autopilot,
            actions,
        };
    }
}
