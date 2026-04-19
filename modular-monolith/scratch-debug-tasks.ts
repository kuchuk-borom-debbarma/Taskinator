import { db } from './src/database';
import { sql } from 'kysely';

async function checkTasks() {
    const projectId = 'e26df1ec-7f32-4fa1-9d74-9831d8067235';
    const userId = '946aecb1-9f1c-4cad-be18-63567d566448';

    console.log(`Checking tasks for project: ${projectId} and user: ${userId}`);

    const authCheck = await sql`
      SELECT 1 FROM project WHERE id = ${projectId}::uuid AND fk_user_id = ${userId}::text
      UNION ALL
      SELECT 1 FROM project_member WHERE fk_project_id = ${projectId}::uuid AND fk_user_id = ${userId}::text
      LIMIT 1
  `.execute(db);

    console.log('Auth check rows:', authCheck.rows.length);

    const tasks = await sql`
      SELECT id, title, status FROM project_task WHERE fk_project_id = ${projectId}::uuid
  `.execute(db);

    console.log('Task count:', tasks.rows.length);
    console.log('Tasks:', JSON.stringify(tasks.rows, null, 2));

    process.exit(0);
}

checkTasks();
