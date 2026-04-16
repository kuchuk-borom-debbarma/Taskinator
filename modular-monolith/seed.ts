import { db } from './src/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🚀 Starting ULTIMATE SCALE Database Seeding...');
    const TOTAL_MEMBERS = 500;
    const TOTAL_TEAMS = 50;
    const TOTAL_DEPTH = 120; // 100+ levels

    try {
        // 1. Clear existing data
        console.log('🧹 Purging old records...');
        await sql`TRUNCATE TABLE task_link_materialized CASCADE`.execute(db);
        await sql`TRUNCATE TABLE task_link CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_task CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_member CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_team CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project CASCADE`.execute(db);
        await sql`TRUNCATE TABLE users CASCADE`.execute(db);

        // 2. Create 500 Users
        console.log(`👤 Generating ${TOTAL_MEMBERS} Strategists...`);
        const users: any[] = [];
        const passwordHash = await Bun.password.hash('a');
        
        // Add Admin
        const adminId = uuidv4();
        await sql`INSERT INTO users (id, email, username, password_hash) VALUES (${adminId}::uuid, 'a@a.c', 'Admin', ${passwordHash})`.execute(db);
        users.push({ id: adminId });

        // Batch generation for speed
        const userBatch: any[] = [];
        for (let i = 1; i < TOTAL_MEMBERS; i++) {
            const id = uuidv4();
            userBatch.push(sql`(${id}::uuid, ${`user${i}@taskinator.io`}, ${`Agent_${i}`}, ${passwordHash})`);
            users.push({ id });
            
            if (userBatch.length >= 100 || i === TOTAL_MEMBERS - 1) {
                await sql`INSERT INTO users (id, email, username, password_hash) VALUES ${sql.join(userBatch)}`.execute(db);
                userBatch.length = 0;
            }
        }

        // 3. Create Enterprise Project
        console.log('🏢 Creating Project: Nexus Global Hyper-Scale');
        const projectId = uuidv4();
        await sql`
            INSERT INTO project (id, name, description, fk_user_id)
            VALUES (${projectId}::uuid, 'Nexus Global Hyper-Scale', 'Testing the limits of the Taskinator columnar engine.', ${adminId})
        `.execute(db);

        // Add all users as project members (Batched)
        console.log('🤝 Adding members to project...');
        const memberBatch: any[] = [];
        for (const user of users) {
            memberBatch.push(sql`(${projectId}::uuid, ${user.id}::uuid)`);
            if (memberBatch.length >= 100) {
                await sql`INSERT INTO project_member (fk_project_id, fk_user_id) VALUES ${sql.join(memberBatch)}`.execute(db);
                memberBatch.length = 0;
            }
        }
        if (memberBatch.length > 0) await sql`INSERT INTO project_member (fk_project_id, fk_user_id) VALUES ${sql.join(memberBatch)}`.execute(db);

        // 4. Create 50 Teams
        console.log(`🛡 Forging ${TOTAL_TEAMS} Specialized Teams...`);
        const teams: any[] = [];
        for (let i = 1; i <= TOTAL_TEAMS; i++) {
            const id = uuidv4();
            await sql`
                INSERT INTO project_team (id, fk_project_id, name, fk_user_id)
                VALUES (${id}::uuid, ${projectId}::uuid, ${`Division ${i}: ${['Kernel', 'Security', 'Edge', 'Cloud', 'Data'][i % 5]}`}, ${adminId})
            `.execute(db);
            teams.push({ id });
        }

        // 5. Generate 120-Level Deep Hierarchy
        console.log(`🌳 Generating ${TOTAL_DEPTH}-Level Deep Task Hierarchy...`);
        let previousTaskId: string | null = null;
        for (let i = 1; i <= TOTAL_DEPTH; i++) {
            const taskId = uuidv4();
            const assignee = users[i % users.length];
            const team = teams[i % teams.length];
            
            await sql`
                INSERT INTO project_task (id, fk_project_id, title, description, status, fk_team_id, fk_member_id, created_by, updated_by)
                VALUES (${taskId}::uuid, ${projectId}::uuid, ${`Sequence Node ${i}`}, ${`Scaling test node at depth ${i}.`}, 'TODO', ${team.id}::uuid, ${assignee.id}::uuid, ${adminId}, ${adminId})
            `.execute(db);

            if (previousTaskId) {
                 await sql`
                    INSERT INTO task_link (fk_project_id, from_task_id, to_task_id, link_type)
                    VALUES (${projectId}::uuid, ${previousTaskId}::uuid, ${taskId}::uuid, 'Blocks')
                `.execute(db);
            }
            previousTaskId = taskId;
        }

        // 6. Bake Materialized Paths (Increased Recursion Depth)
        console.log('🥧 Baking Graph Stories (Max Depth 200)...');
        await sql`
            INSERT INTO task_link_materialized (fk_project_id, origin_id, terminal_id, path_task_ids, path_link_types, depth)
            WITH RECURSIVE paths(origin_id, terminal_id, path_task_ids, path_link_types, depth) AS (
                SELECT 
                    from_task_id as origin_id,
                    to_task_id as terminal_id,
                    ARRAY[from_task_id, to_task_id]::uuid[] as path_task_ids,
                    ARRAY[link_type]::text[] as path_link_types,
                    1 as depth
                FROM task_link
                WHERE fk_project_id = ${projectId}::uuid

                UNION ALL

                SELECT
                    tl.from_task_id as origin_id,
                    p.terminal_id,
                    tl.from_task_id || p.path_task_ids as path_task_ids,
                    tl.link_type || p.path_link_types as path_link_types,
                    p.depth + 1
                FROM task_link tl
                JOIN paths p ON tl.to_task_id = p.origin_id
                WHERE p.depth < 200
                  AND tl.fk_project_id = ${projectId}::uuid
            )
            SELECT ${projectId}::uuid, origin_id, terminal_id, path_task_ids, path_link_types, depth
            FROM paths
        `.execute(db);

        console.log('✅ ULTIMATE SCALE Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
