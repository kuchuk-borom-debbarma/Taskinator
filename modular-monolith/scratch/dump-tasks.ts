import { db } from '../src/database';
import { sql } from 'kysely';

const projectId = 'fc51639b-1619-44a1-a72a-eb639e34418a';

async function dump() {
    console.log(`Dumping tasks for project: ${projectId}`);
    const result = await sql`
        SELECT id, title, TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "createdAtPrecision"
        FROM project_task 
        WHERE fk_project_id = ${projectId}::uuid 
        ORDER BY created_at DESC, id DESC
    `.execute(db);
    
    console.table(result.rows.map((r: any) => ({
        id: r.id.substring(0, 8),
        title: r.title,
        createdAt: r.createdAtPrecision
    })));
    process.exit(0);
}

dump();
