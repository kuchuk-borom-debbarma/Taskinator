import { sql } from 'kysely';
import { db } from '../src/infra/database';

async function run() {
    console.log('Applying migrations to project_task...');

    await sql`ALTER TABLE project_task ADD COLUMN IF NOT EXISTS prev_status TEXT`.execute(
        db,
    );
    await sql`ALTER TABLE project_task ADD COLUMN IF NOT EXISTS prev_priority INTEGER`.execute(
        db,
    );
    await sql`ALTER TABLE project_task ADD COLUMN IF NOT EXISTS prev_title TEXT`.execute(
        db,
    );
    await sql`ALTER TABLE project_task ADD COLUMN IF NOT EXISTS prev_team_id UUID`.execute(
        db,
    );
    await sql`ALTER TABLE project_task ADD COLUMN IF NOT EXISTS prev_member_id TEXT`.execute(
        db,
    );

    console.log('✅ Migrations applied successfully!');
    process.exit(0);
}

run().catch((err) => {
    console.error('❌ Failed to run migrations:', err);
    process.exit(1);
});
