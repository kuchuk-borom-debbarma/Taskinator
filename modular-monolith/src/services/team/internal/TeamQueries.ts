import { db } from '../../../database';
import type { Team } from '../TeamService.ts';
import { getTimeString } from '../../../utils/utils.ts';
import { sql } from 'kysely';

export const insertTeam = async (data: {
    userId: string;
    projectId: string;
    teams: string[];
}): Promise<Team[]> => {
    const added = await sql<Team>`
        INSERT INTO project_team (fk_project_id, name, created_at, fk_user_id)
        SELECT ${data.projectId},
               unnest(${data.teams}::text[]),
               ${getTimeString()},
               ${data.userId} WHERE EXISTS (
            SELECT 1 FROM project
            WHERE id = ${data.projectId}
            AND fk_user_id = ${data.userId}
            )
            RETURNING
            id, name, fk_project_id AS "projectId", fk_user_id AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
    `.execute(db);

    return added.rows;
};
