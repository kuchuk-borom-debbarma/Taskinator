import { sql } from 'kysely';
import { db } from './src/database';

async function check() {
    console.log('--- DB Check ---');
    const projectTasks = await sql`SELECT count(*) FROM project_task`.execute(
        db,
    );
    console.log('Total tasks:', projectTasks.rows[0]);

    const projects =
        await sql`SELECT id, name, fk_user_id FROM project`.execute(db);
    console.log('Projects:', projects.rows);

    const members =
        await sql`SELECT fk_project_id, fk_user_id FROM project_member`.execute(
            db,
        );
    console.log('Members:', members.rows);

    process.exit(0);
}

check().catch((err) => {
    console.error(err);
    process.exit(1);
});
