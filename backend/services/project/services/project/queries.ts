import {db} from "../../database/db";
import {eq, and, exists, sql, or} from "drizzle-orm";
import {projectsTable, projectMembersTable} from "../../database/schema";
import {randomUUID} from "crypto";

export const insertProject = async (data: {
    userId: string;
    name: string;
    description?: string;
}) => {
    const {userId, name, description} = data;

    try {
        const result = await db
            .insert(projectsTable)
            .values({
                id: randomUUID(),
                name,
                description: description ?? null,
                fk_user_id: userId,
                created_at: new Date(),
                denormalized_members_count: 0,
                denormalized_tasks_count: 0,
                denormalized_teams_count: 0,
            })
            .onConflictDoNothing()
            .returning();

        const added = result[0];
        if (added) {
            return added;
        }

        throw new Error("No rows returned");
    } catch (err) {
        console.error("Error at insertProject:", err);
        return null;
    }
};

export const deleteProject = async (data: {
    userId: string;
    projectId: string;
}): Promise<boolean> => {
    const {userId, projectId} = data;

    try {
        const result = await db
            .delete(projectsTable)
            .where(
                and(
                    eq(projectsTable.id, projectId),
                    eq(projectsTable.fk_user_id, userId)
                )
            )
            .returning();

        return result.length > 0;
    } catch (err) {
        console.error("Error at deleteProject:", err);
        return false;
    }
};

export const insertProjectMember = async (data: {
    userId: string;
    userToAdd: string;
    projectId: string;
}): Promise<boolean> => {
    const {userId, projectId, userToAdd} = data;

    try {
        const result = await db
            .insert(projectMembersTable)
            .select(
                sql`
                    SELECT ${userToAdd}::text AS fk_user_id, ${projectId}::text AS fk_project_id
                    FROM (VALUES (1)) AS dummy
                    WHERE EXISTS (SELECT 1
                                  FROM ${projectsTable}
                                  WHERE ${projectsTable.id} = ${projectId}
                                    AND ${projectsTable.fk_user_id} = ${userId})
                `
            )
            .returning();

        return result.length > 0;
    } catch (error) {
        console.error("Error at insertProjectMember:", error);
        return false;
    }
};

export const removeProjectMember = async (data: {
    userId: string;
    userToRemove: string;
    projectId: string;
}): Promise<boolean> => {
    const {projectId, userId, userToRemove} = data;

    // Prevent owner from removing themselves via member check —
    // if you want to allow self-removal, remove the userId !== userToRemove guard
    if (userId === userToRemove) {
        console.warn("removeProjectMember: owner cannot remove themselves this way");
        return false;
    }

    try {
        const result = await db
            .delete(projectMembersTable)
            .where(
                and(
                    eq(projectMembersTable.fk_project_id, projectId),
                    eq(projectMembersTable.fk_user_id, userToRemove),
                    or(
                        // Project owner can remove anyone
                        exists(
                            db
                                .select()
                                .from(projectsTable)
                                .where(
                                    and(
                                        eq(projectsTable.id, projectId),
                                        eq(projectsTable.fk_user_id, userId)
                                    )
                                )
                                .limit(1)
                        ),
                        // Project member can remove themselves only
                        and(
                            eq(sql`${userId}`, sql`${userToRemove}`),
                            exists(
                                db
                                    .select()
                                    .from(projectMembersTable)
                                    .where(
                                        and(
                                            eq(projectMembersTable.fk_project_id, projectId),
                                            eq(projectMembersTable.fk_user_id, userId)
                                        )
                                    )
                                    .limit(1)
                            )
                        )
                    )
                )
            )
            .returning();

        return result.length > 0;
    } catch (error) {
        console.error("Error at removeProjectMember:", error);
        return false;
    }
};