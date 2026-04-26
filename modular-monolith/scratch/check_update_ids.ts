import { sql } from 'kysely';
import { db } from './src/database/index.ts';

async function check() {
    const taskId = 'c8011320-501d-41e9-9d6b-2b479cd350e4';
    const projectId = 'f0bbbad7-c84c-417b-8e81-2ef009e86996';

    const row = await sql`
        SELECT id, fk_project_id, version FROM project_task WHERE id = ${taskId}::uuid
    `.execute(db);

    console.log('Row by ID:', row.rows);

    const rowByBoth = await sql`
        SELECT id, fk_project_id, version FROM project_task WHERE id = ${taskId}::uuid AND fk_project_id = ${projectId}::uuid
    `.execute(db);

    console.log('Row by both:', rowByBoth.rows);

    process.exit(0);
}

check();
