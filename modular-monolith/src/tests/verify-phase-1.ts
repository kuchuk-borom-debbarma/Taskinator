import { sql } from 'kysely';
import { db } from '../database/index.ts';

async function verify() {
    console.log('[Verification] Starting Phase 1 verification...');

    try {
        // 1. Check if behavior_rule table exists
        const tableCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'behavior_rule'
            );
        `.execute(db);

        const exists = (tableCheck.rows[0] as any).exists;
        if (exists) {
            console.log('✅ Table "behavior_rule" exists.');
        } else {
            console.error('❌ Table "behavior_rule" does NOT exist.');
            process.exit(1);
        }

        // 2. Check if auto_action table is empty (if it exists)
        const autoActionExistsCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'auto_action'
            );
        `.execute(db);

        if ((autoActionExistsCheck.rows[0] as any).exists) {
            const countResult = await db
                .selectFrom('auto_action' as any)
                .select(db.fn.count('id' as any).as('count'))
                .executeTakeFirst();

            const count = Number((countResult as any)?.count || 0);
            if (count === 0) {
                console.log('✅ Table "auto_action" is empty.');
            } else {
                console.error(
                    `❌ Table "auto_action" is NOT empty (count: ${count}).`,
                );
                process.exit(1);
            }
        } else {
            console.log(
                'ℹ️ Table "auto_action" does not exist (skipping wipe check).',
            );
        }

        // 3. Check columns in behavior_rule
        const columnCheck = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'behavior_rule';
        `.execute(db);

        const columns = columnCheck.rows.map((r: any) => r.column_name);
        const requiredColumns = [
            'id',
            'fk_project_id',
            'name',
            'is_active',
            'behavior_type',
            'fk_task_id',
            'criteria_field',
            'criteria_operator',
            'criteria_value',
            'action_message',
            'action_value',
            'version',
            'created_at',
            'updated_at',
        ];

        for (const col of requiredColumns) {
            if (columns.includes(col)) {
                // console.log(`✅ Column "${col}" found.`);
            } else {
                console.error(`❌ Column "${col}" missing in "behavior_rule".`);
                process.exit(1);
            }
        }
        console.log('✅ All required columns found in "behavior_rule".');

        console.log('[Verification] Success! Phase 1 requirements met.');
    } catch (e) {
        console.error('[Verification] Failed:', e);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verify();
