import { db } from './src/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('🚀 Starting Database Seeding...');

    try {
        // 1. Clear existing data in reverse order of dependencies
        console.log('🧹 Cleaning up existing data...');
        await sql`TRUNCATE TABLE task_link_materialized CASCADE`.execute(db);
        await sql`TRUNCATE TABLE task_link CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_task CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_member CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project_team CASCADE`.execute(db);
        await sql`TRUNCATE TABLE project CASCADE`.execute(db);
        await sql`TRUNCATE TABLE users CASCADE`.execute(db);

        // 2. Create User 'a@a.c'
        console.log('👤 Creating User: a@a.c');
        const userId = uuidv4();
        const passwordHash = await Bun.password.hash('a');
        await sql`
            INSERT INTO users (id, email, username, password_hash)
            VALUES (${userId}::uuid, 'a@a.c', 'a', ${passwordHash})
        `.execute(db);

        // 3. Create Project: Apollo Lunar Rover
        console.log('🛰 Creating Project: Apollo Lunar Rover');
        const projectId = uuidv4();
        await sql`
            INSERT INTO project (id, name, description, fk_user_id)
            VALUES (${projectId}::uuid, 'Apollo Lunar Rover', 'Next-gen lunar exploration orchestration platform.', ${userId})
        `.execute(db);

        // Add user as project member
        await sql`
            INSERT INTO project_member (fk_project_id, fk_user_id)
            VALUES (${projectId}::uuid, ${userId})
        `.execute(db);

        // 4. Create Tasks
        console.log('📝 Generating Tasks...');
        const tasks = [
            { id: uuidv4(), title: 'Chassis Structural Design', description: 'Main aluminum alloy frame design for lunar terrain.' },
            { id: uuidv4(), title: 'Solid-State Battery Pack', description: 'High-density energy storage for extended missions.' },
            { id: uuidv4(), title: 'Thermal Management System', description: 'Maintaining optimal temperature in extreme vacuum.' },
            { id: uuidv4(), title: 'LRV Navigation Computer', description: 'Autonomous pathfinding and telemetry processing.' },
            { id: uuidv4(), title: 'High-Torque Hub Motors', description: 'In-wheel motors for 4-wheel independent drive.' },
            { id: uuidv4(), title: 'Lunar Surface Comms Array', description: 'S-band and X-band communication for direct-to-earth links.' },
            { id: uuidv4(), title: 'Final Systems Integration', description: 'Full assembly and software-hardware handshake.' },
        ];

        for (const task of tasks) {
            await sql`
                INSERT INTO project_task (id, fk_project_id, title, description, status, created_by, updated_by)
                VALUES (${task.id}::uuid, ${projectId}::uuid, ${task.title}, ${task.description}, 'TODO', ${userId}, ${userId})
            `.execute(db);
        }

        // 5. Forge Relationships (Links)
        console.log('🔗 Forging Relationships...');
        const links = [
            { from: tasks[1].id, to: tasks[2].id, type: 'Blocks' },      // Battery Blocks Thermal
            { from: tasks[0].id, to: tasks[4].id, type: 'Relates to' },  // Chassis Relates to Hub Motors
            { from: tasks[4].id, to: tasks[6].id, type: 'Blocks' },      // Hub Motors Blocks Integration
            { from: tasks[3].id, to: tasks[5].id, type: 'Relates to' },  // Nav Computer Relates to Comms
            { from: tasks[5].id, to: tasks[6].id, type: 'Blocks' },      // Comms Blocks Integration
            { from: tasks[0].id, to: tasks[1].id, type: 'Relates to' },  // Chassis Relates to Battery
        ];

        for (const link of links) {
            await sql`
                INSERT INTO task_link (fk_project_id, from_task_id, to_task_id, link_type)
                VALUES (${projectId}::uuid, ${link.from}::uuid, ${link.to}::uuid, ${link.type})
            `.execute(db);
        }

        // 6. Bake Materialized Paths (Manually for seeding)
        console.log('🥧 Baking Materialized Paths...');
        for (const task of tasks) {
             await sql`
                WITH RECURSIVE paths(origin_id, terminal_id, path_task_ids, path_link_types, depth) AS (
                    SELECT 
                        from_task_id as origin_id,
                        to_task_id as terminal_id,
                        ARRAY[from_task_id, to_task_id]::uuid[] as path_task_ids,
                        ARRAY[link_type]::text[] as path_link_types,
                        1 as depth
                    FROM task_link
                    WHERE to_task_id = ${task.id}::uuid
                      AND fk_project_id = ${projectId}::uuid

                    UNION ALL

                    SELECT
                        tl.from_task_id as origin_id,
                        p.terminal_id,
                        tl.from_task_id || p.path_task_ids as path_task_ids,
                        tl.link_type || p.path_link_types as path_link_types,
                        p.depth + 1
                    FROM task_link tl
                    JOIN paths p ON tl.to_task_id = p.origin_id
                    WHERE p.depth < 50
                )
                INSERT INTO task_link_materialized (fk_project_id, origin_id, terminal_id, path_task_ids, path_link_types, depth)
                SELECT ${projectId}::uuid, origin_id, terminal_id, path_task_ids, path_link_types, depth
                FROM paths
            `.execute(db);
        }

        console.log('✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
