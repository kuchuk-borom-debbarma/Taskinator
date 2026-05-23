import { sql } from 'kysely';
import { db } from '../../../database';

export class CascadeService {
    async resolveBlockers(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        targetStatus: string;
    }) {
        const { actorId, traceId, taskId, targetStatus } = param;

        await db
            .updateTable('project_task')
            .set({
                status: targetStatus,
                updated_by: actorId,
                updated_at: new Date().toISOString(),
            })
            .where('id', 'in', (qb) =>
                qb
                    .selectFrom('task_link')
                    .select('target_task_id')
                    .where('source_task_id', '=', taskId)
                    .where('label', '=', 'blocks')
                    .where((eb) =>
                        eb.not(
                            eb.exists(
                                eb
                                    .selectFrom('task_link as tl2')
                                    .innerJoin(
                                        'project_task as pt2',
                                        'pt2.id',
                                        'tl2.source_task_id',
                                    )
                                    .whereRef(
                                        'tl2.target_task_id',
                                        '=',
                                        'task_link.target_task_id',
                                    )
                                    .where('tl2.label', '=', 'blocks')
                                    .where('tl2.source_task_id', '!=', taskId)
                                    .where('pt2.status', '!=', 'DONE'),
                            ),
                        ),
                    ),
            )
            .where('status', '!=', targetStatus)
            .execute();
    }

    async cascadePriority(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        priority: number;
    }) {
        const { actorId, traceId, taskId, priority } = param;

        await db
            .updateTable('project_task')
            .set({
                priority,
                updated_by: actorId,
                updated_at: new Date().toISOString(),
            })
            .where('id', 'in', (qb) =>
                qb
                    .selectFrom('task_reachability')
                    .select('descendant_task_id')
                    .where('ancestor_task_id', '=', taskId)
                    .where('depth', '>', 0),
            )
            .where(sql<boolean>`priority IS DISTINCT FROM ${priority}`)
            .execute();
    }

    async cascadeTeam(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
        teamId: string | null;
    }) {
        const { actorId, traceId, taskId, teamId } = param;

        await db
            .updateTable('project_task')
            .set({
                fk_team_id: teamId,
                updated_by: actorId,
                updated_at: new Date().toISOString(),
            })
            .where('id', 'in', (qb) =>
                qb
                    .selectFrom('task_reachability')
                    .select('descendant_task_id')
                    .where('ancestor_task_id', '=', taskId)
                    .where('depth', '>', 0),
            )
            .where(sql<boolean>`fk_team_id IS DISTINCT FROM ${teamId}`)
            .execute();
    }

    async cascadeDelete(param: {
        actorId: string;
        traceId?: string;
        taskId: string;
    }) {
        const { taskId } = param;

        await db
            .deleteFrom('project_task')
            .where('id', 'in', (qb) =>
                qb
                    .selectFrom('task_reachability')
                    .select('descendant_task_id')
                    .where('ancestor_task_id', '=', taskId)
                    .where('depth', '>', 0),
            )
            .execute();
    }
}

export const cascadeService = new CascadeService();
