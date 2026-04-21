import { sql } from 'kysely';
import { db } from './index.ts';

async function run() {
    console.log('[Migration] Starting denormalization migration...');

    try {
        // 1. Add Denormalized Count Columns to Project, Team, and User
        console.log(
            '[Migration] Adding count columns to project, project_team, and users...',
        );
        await sql`
            ALTER TABLE project 
            ADD COLUMN IF NOT EXISTS members_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS tasks_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS teams_count INTEGER NOT NULL DEFAULT 0
        `.execute(db);

        await sql`
            ALTER TABLE project_team 
            ADD COLUMN IF NOT EXISTS members_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS tasks_count INTEGER NOT NULL DEFAULT 0
        `.execute(db);

        await sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS projects_count INTEGER NOT NULL DEFAULT 0
        `.execute(db);

        // 2. Add Columns to project_task
        console.log('[Migration] Adding columns to project_task...');
        await sql`
            ALTER TABLE project_task 
            ADD COLUMN IF NOT EXISTS direct_incoming_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS direct_outgoing_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_incoming_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS total_outgoing_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS incoming_label_counts JSONB NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS outgoing_label_counts JSONB NOT NULL DEFAULT '{}'
        `.execute(db);

        // 2. Backfill Direct Counts and Labels
        console.log('[Migration] Backfilling direct counts and label maps...');
        await sql`
            WITH direct_incoming AS (
                SELECT target_task_id, COUNT(*) as cnt, jsonb_object_agg(label, label_cnt) as labels
                FROM (
                    SELECT target_task_id, label, COUNT(*) as label_cnt
                    FROM task_link
                    GROUP BY target_task_id, label
                ) s
                GROUP BY target_task_id
            ),
            direct_outgoing AS (
                SELECT source_task_id, COUNT(*) as cnt, jsonb_object_agg(label, label_cnt) as labels
                FROM (
                    SELECT source_task_id, label, COUNT(*) as label_cnt
                    FROM task_link
                    GROUP BY source_task_id, label
                ) s
                GROUP BY source_task_id
            )
            UPDATE project_task pt
            SET 
                direct_incoming_count = COALESCE(d_inc.cnt, 0),
                incoming_label_counts = COALESCE(d_inc.labels, '{}'::jsonb),
                direct_outgoing_count = COALESCE(d_out.cnt, 0),
                outgoing_label_counts = COALESCE(d_out.labels, '{}'::jsonb)
            FROM (SELECT id FROM project_task) p_all
            LEFT JOIN direct_incoming d_inc ON d_inc.target_task_id = p_all.id
            LEFT JOIN direct_outgoing d_out ON d_out.source_task_id = p_all.id
            WHERE pt.id = p_all.id
        `.execute(db);

        // 3. Backfill Transitive Counts
        console.log('[Migration] Backfilling transitive counts...');
        await sql`
            WITH transitive_incoming AS (
                SELECT descendant_task_id, COUNT(*) as cnt
                FROM task_reachability
                GROUP BY descendant_task_id
            ),
            transitive_outgoing AS (
                SELECT ancestor_task_id, COUNT(*) as cnt
                FROM task_reachability
                GROUP BY ancestor_task_id
            )
            UPDATE project_task pt
            SET 
                total_incoming_count = COALESCE(ti.cnt, 0),
                total_outgoing_count = COALESCE(to_cnt.cnt, 0)
            FROM (SELECT id FROM project_task) p_all
            LEFT JOIN transitive_incoming ti ON ti.descendant_task_id = p_all.id
            LEFT JOIN transitive_outgoing to_cnt ON to_cnt.ancestor_task_id = p_all.id
            WHERE pt.id = p_all.id
        `.execute(db);

        console.log('[Migration] Success! All counts denormalized.');
    } catch (e) {
        console.error('[Migration] Failed:', e);
        process.exit(1);
    } finally {
        // Note: db pool might need manual closing if not using a listener
        process.exit(0);
    }
}

run();
