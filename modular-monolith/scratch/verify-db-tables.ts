import { sql } from 'kysely';
import { db } from '../src/infra/database';

async function run() {
    console.log('Verifying project_task columns...');
    const taskCols = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'project_task'
    `.execute(db);
    console.log('project_task columns:', taskCols.rows);

    console.log('\nChecking if task_automation_rule exists...');
    const ruleCols = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'task_automation_rule'
    `.execute(db);

    if (ruleCols.rows.length > 0) {
        console.log('✅ task_automation_rule exists!');
        console.log('task_automation_rule columns:', ruleCols.rows);
    } else {
        console.log('❌ task_automation_rule DOES NOT exist!');

        // Let's create it if it doesn't exist to make sure the db is perfectly migrated!
        console.log('Creating task_automation_rule table...');
        const path = require('node:path');
        const fs = require('node:fs');
        const migrationPath = path.resolve(
            import.meta.dir,
            '../database/migration_automation_rule.sql',
        );
        const sqlContent = fs.readFileSync(migrationPath, 'utf8');
        await sql`${sql.raw(sqlContent)}`.execute(db);
        console.log('✅ Created task_automation_rule table!');
    }

    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});
