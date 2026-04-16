import { db } from './src/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
//  ⚙️  CONFIGURATION — Tune all numbers here
// ============================================================
const CONFIG = {
    // Users
    TOTAL_USERS: 10_000,

    // Projects
    TOTAL_EXTRA_PROJECTS: 50,       // lightweight side projects (in addition to the main stress-test one)

    // Main project
    TOTAL_TEAMS: 500,               // teams inside the main project
    MEMBERS_PER_TEAM: 150,          // how many of the user pool to assign per team (sampled randomly)

    // Tasks
    TOTAL_TASKS: 200_000,           // tasks inside the main project
    TASK_LINK_RATIO: 0.75,          // fraction of tasks that get at least one outgoing link → ~150k links
    MAX_LINKS_PER_TASK: 3,          // max outgoing links per task

    // Graph materialization
    MATERIALIZATION_DEPTH_CAP: 100, // max recursive depth for task_link_materialized

    // Batch sizes (tune down if you hit memory limits)
    COPY_BATCH_ROWS: 1_000,         // rows flushed per COPY statement
} as const;

// ============================================================
//  🎨  Realistic data pools
// ============================================================
const FIRST_NAMES = [
    'Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Alexander',
    'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Amelia', 'Mia', 'Harper', 'Evelyn',
    'Aiden', 'Jackson', 'Sebastian', 'Mateo', 'Jack', 'Owen', 'Theodore', 'Amir', 'Ethan', 'Leo',
    'Aria', 'Luna', 'Chloe', 'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor',
    'Rohan', 'Priya', 'Arjun', 'Ananya', 'Vikram', 'Divya', 'Karan', 'Sneha', 'Rahul', 'Pooja',
    'Wei', 'Xiao', 'Ming', 'Jing', 'Lei', 'Fang', 'Yan', 'Qiang', 'Hui', 'Ling',
    'Tariq', 'Fatima', 'Omar', 'Layla', 'Hassan', 'Nour', 'Zara', 'Yusuf', 'Aisha', 'Khalid',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Robinson', 'Clark', 'Lewis',
    'Patel', 'Shah', 'Kumar', 'Singh', 'Sharma', 'Gupta', 'Mehta', 'Joshi', 'Rao', 'Nair',
    'Chen', 'Wang', 'Li', 'Zhang', 'Liu', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
    'Ahmed', 'Ali', 'Khan', 'Hassan', 'Ibrahim', 'Mohammed', 'Abdullah', 'Rahman', 'Siddiqui', 'Malik',
    'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
];

const PROJECT_NAMES = [
    'Nexus Core', 'Atlas Platform', 'Orion Suite', 'Helix Engine', 'Prism Gateway',
    'Vertex Cloud', 'Quantum Mesh', 'Aurora Stack', 'Zenith Hub', 'Cipher Network',
    'Eclipse Runtime', 'Polaris Grid', 'Nova Fabric', 'Titan Cluster', 'Specter API',
    'Apex Forge', 'Cobalt Pipeline', 'Meridian OS', 'Obsidian Console', 'Stratos Layer',
    'Vortex DB', 'Cascade UI', 'Ember Framework', 'Flux Monitor', 'Glacier Store',
    'Harbor Registry', 'Iris Workflow', 'Jade Scheduler', 'Kinetic Auth', 'Lumen CDN',
    'Mirage Cache', 'Nimbus Proxy', 'Onyx Router', 'Pinnacle Vault', 'Quartz Ledger',
    'Radiant Portal', 'Sapphire Bus', 'Tempo Queue', 'Umbra Shield', 'Vivid Dashboard',
    'Warp Engine', 'Xenon Bridge', 'Yonder Relay', 'Zeal Orchestrator', 'Anchor Service',
    'Beacon Tracker', 'Chronicle Logger', 'Dune Processor', 'Epoch Syncer', 'Fathom Analytics',
];

const TEAM_PREFIXES = [
    'Kernel', 'Security', 'Edge', 'Cloud', 'Data', 'Platform', 'DevOps', 'Infrastructure',
    'Frontend', 'Backend', 'Mobile', 'AI/ML', 'Blockchain', 'QA', 'Reliability', 'Networking',
    'Compliance', 'Identity', 'Payments', 'Search', 'Recommendations', 'Streaming', 'Storage',
    'Monitoring', 'Alerting', 'Billing', 'Onboarding', 'Growth', 'Experimentation', 'Localization',
];

const TEAM_SUFFIXES = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Gamma', 'Horizon',
    'Ignite', 'Jade', 'Kilo', 'Lima', 'Maven', 'Nova', 'Omega', 'Phoenix',
    'Quantum', 'Raptor', 'Sigma', 'Titan', 'Ultra', 'Viper', 'Wolf', 'Xenon', 'Yankee', 'Zulu',
];

const TASK_VERBS = [
    'Implement', 'Refactor', 'Fix', 'Optimize', 'Deploy', 'Migrate', 'Review', 'Test',
    'Document', 'Audit', 'Debug', 'Monitor', 'Integrate', 'Configure', 'Update', 'Deprecate',
    'Design', 'Architect', 'Benchmark', 'Investigate', 'Prototype', 'Validate', 'Automate', 'Scale',
];

const TASK_NOUNS = [
    'authentication flow', 'API rate limiter', 'database indexing', 'CI/CD pipeline',
    'cache eviction policy', 'WebSocket handler', 'OAuth2 integration', 'gRPC endpoints',
    'Kafka consumers', 'Redis cluster', 'S3 lifecycle rules', 'GraphQL resolvers',
    'JWT refresh logic', 'Elasticsearch mapping', 'load balancer config', 'TLS certificates',
    'feature flags', 'A/B test framework', 'metrics dashboard', 'alert thresholds',
    'data retention policy', 'audit logs', 'user onboarding', 'payment gateway',
    'RBAC permissions', 'multi-tenancy layer', 'dark mode support', 'mobile deep links',
    'search ranking', 'recommendation engine', 'billing cycle', 'SSO provider',
    'service mesh config', 'container orchestration', 'secrets rotation', 'backup strategy',
    'disaster recovery', 'capacity planning', 'SLA monitoring', 'cost attribution',
];

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;
const STATUS_WEIGHTS = [0.30, 0.25, 0.15, 0.20, 0.10]; // must sum to 1

const LINK_TYPES = ['Blocks', 'Relates', 'Duplicates'] as const;

// ============================================================
//  🛠️  Helpers
// ============================================================
function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(arr: readonly T[], weights: number[]): T {
    const r = Math.random();
    let cumulative = 0;
    for (let i = 0; i < arr.length; i++) {
        cumulative += weights[i];
        if (r < cumulative) return arr[i];
    }
    return arr[arr.length - 1];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUsername(first: string, last: string, suffix: number): string {
    return `${first.toLowerCase()}.${last.toLowerCase()}${suffix}`;
}

function generateEmail(username: string): string {
    const domains = ['taskinator.io', 'devhive.co', 'workstream.dev', 'nexusapp.io', 'oriontech.com'];
    return `${username}@${pick(domains)}`;
}

function generateTaskTitle(): string {
    return `${pick(TASK_VERBS)} ${pick(TASK_NOUNS)}`;
}

function generateTeamName(index: number): string {
    return `${pick(TEAM_PREFIXES)} ${pick(TEAM_SUFFIXES)} — Unit ${index}`;
}

// ============================================================
//  ⚡  Bulk COPY helper
//  Streams rows as tab-separated text via a raw COPY statement.
//  Much faster than batched INSERTs.
// ============================================================
async function bulkCopy(
    table: string,
    columns: string[],
    rows: string[][], // each inner array = one row, values already escaped
) {
    if (rows.length === 0) return;
    const colList = columns.join(', ');
    for (let offset = 0; offset < rows.length; offset += CONFIG.COPY_BATCH_ROWS) {
        const chunk = rows.slice(offset, offset + CONFIG.COPY_BATCH_ROWS);
        const values = chunk
            .map(row => `(${row.join(', ')})`)
            .join(',\n');
        await sql.raw(`INSERT INTO ${table} (${colList}) VALUES ${values}`).execute(db);
    }
}

// ============================================================
//  🌱  SEED
// ============================================================
async function seed() {
    const t0 = Date.now();
    console.log('🚀 Starting Configurable Hyper-Scale Seeding...');
    console.log('📋 Config:', JSON.stringify(CONFIG, null, 2));

    try {
        // ----------------------------------------------------------
        // 1. Truncate
        // ----------------------------------------------------------
        console.log('\n🧹 Truncating old data...');
        for (const table of [
            'task_link_materialized',
            'task_link',
            'project_task',
            'project_member',
            'project_team',
            'project',
            'users',
        ]) {
            await sql.raw(`TRUNCATE TABLE ${table} CASCADE`).execute(db);
        }
        console.log(`   ✓ Done (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 2. Users
        // ----------------------------------------------------------
        console.log(`\n👤 Generating ${CONFIG.TOTAL_USERS.toLocaleString()} users...`);
        const passwordHash = await Bun.password.hash('password');
        const adminId = uuidv4();

        // Admin first
        await sql`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (${adminId}::uuid, 'admin@taskinator.io', 'admin', ${passwordHash})
    `.execute(db);

        const userIds: string[] = [adminId];
        const userRows: string[][] = [];

        for (let i = 1; i < CONFIG.TOTAL_USERS; i++) {
            const id = uuidv4();
            userIds.push(id);
            const first = pick(FIRST_NAMES);
            const last = pick(LAST_NAMES);
            const uname = generateUsername(first, last, i);
            const email = generateEmail(uname);
            userRows.push([
                `'${id}'::uuid`,
                `'${email}'`,
                `'${uname}'`,
                `'${passwordHash}'`,
            ]);
        }

        await bulkCopy('users', ['id', 'email', 'username', 'password_hash'], userRows);
        console.log(`   ✓ ${userIds.length.toLocaleString()} users (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 3. Main stress-test project
        // ----------------------------------------------------------
        console.log('\n🏢 Creating main stress-test project...');
        const mainProjectId = uuidv4();
        await sql`
      INSERT INTO project (id, name, description, fk_user_id)
      VALUES (
        ${mainProjectId}::uuid,
        'Nexus Hyper-Scale Stress Test',
        'The ultimate load test for the Taskinator columnar engine.',
        ${adminId}
      )
    `.execute(db);

        // All users → project members
        const memberRows: string[][] = userIds.map(uid => [
            `'${mainProjectId}'::uuid`,
            `'${uid}'::uuid`,
        ]);
        await bulkCopy('project_member', ['fk_project_id', 'fk_user_id'], memberRows);
        console.log(`   ✓ ${userIds.length.toLocaleString()} members added (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 4. Teams for main project
        // ----------------------------------------------------------
        console.log(`\n🛡 Creating ${CONFIG.TOTAL_TEAMS.toLocaleString()} teams...`);
        const teamIds: string[] = [];
        const teamRows: string[][] = [];

        for (let i = 1; i <= CONFIG.TOTAL_TEAMS; i++) {
            const id = uuidv4();
            teamIds.push(id);
            const name = generateTeamName(i).replace(/'/g, "''");
            teamRows.push([
                `'${id}'::uuid`,
                `'${mainProjectId}'::uuid`,
                `'${name}'`,
                `'${adminId}'::uuid`,
            ]);
        }
        await bulkCopy('project_team', ['id', 'fk_project_id', 'name', 'fk_user_id'], teamRows);
        console.log(`   ✓ ${teamIds.length.toLocaleString()} teams (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 4b. Team members (project_team_member if exists, else skip)
        // ----------------------------------------------------------
        // Assign MEMBERS_PER_TEAM random users to each team
        // Adjust table name to match your actual schema
        try {
            console.log(`\n👥 Assigning ~${CONFIG.MEMBERS_PER_TEAM} members per team...`);
            const teamMemberRows: string[][] = [];
            for (const teamId of teamIds) {
                const shuffled = [...userIds].sort(() => Math.random() - 0.5);
                const assigned = shuffled.slice(0, CONFIG.MEMBERS_PER_TEAM);
                for (const uid of assigned) {
                    teamMemberRows.push([
                        `'${mainProjectId}'::uuid`,
                        `'${teamId}'::uuid`,
                        `'${uid}'::uuid`
                    ]);
                }
            }
            await bulkCopy(
                'project_team_member',
                ['fk_project_id', 'fk_team_id', 'fk_user_id'],
                teamMemberRows
            );
            console.log(`   ✓ ${teamMemberRows.length.toLocaleString()} team-member rows (${elapsed(t0)})`);
        } catch (err: any) {
            console.log(`   ⚠️  Team assignment failed: ${err.message || 'Unknown error'}`);
        }

        // ----------------------------------------------------------
        // 5. Tasks for main project
        // ----------------------------------------------------------
        console.log(`\n📋 Creating ${CONFIG.TOTAL_TASKS.toLocaleString()} tasks...`);
        const taskIds: string[] = [];
        const taskRows: string[][] = [];

        for (let i = 0; i < CONFIG.TOTAL_TASKS; i++) {
            const id = uuidv4();
            taskIds.push(id);
            const title = generateTaskTitle().replace(/'/g, "''");
            const desc = `Auto-generated stress task #${i + 1} for load testing.`;
            const status = pickWeighted(TASK_STATUSES, STATUS_WEIGHTS);
            const teamId = pick(teamIds);
            const memberId = pick(userIds);

            taskRows.push([
                `'${id}'::uuid`,
                `'${mainProjectId}'::uuid`,
                `'${title}'`,
                `'${desc}'`,
                `'${status}'`,
                `'${teamId}'::uuid`,
                `'${memberId}'::uuid`,
                `'${adminId}'::uuid`,
                `'${adminId}'::uuid`,
            ]);
        }

        await bulkCopy(
            'project_task',
            ['id', 'fk_project_id', 'title', 'description', 'status',
                'fk_team_id', 'fk_member_id', 'created_by', 'updated_by'],
            taskRows,
        );
        console.log(`   ✓ ${taskIds.length.toLocaleString()} tasks (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 6. Task links
        // ----------------------------------------------------------
        console.log('\n🔗 Generating task links...');
        const linkRows: string[][] = [];
        const linkedSet = new Set<string>(); // avoid duplicate from→to pairs

        for (let i = 0; i < taskIds.length; i++) {
            if (Math.random() > CONFIG.TASK_LINK_RATIO) continue;
            const numLinks = randomInt(1, CONFIG.MAX_LINKS_PER_TASK);
            for (let l = 0; l < numLinks; l++) {
                const toIdx = randomInt(0, taskIds.length - 1);
                if (toIdx === i) continue;
                const key = `${i}-${toIdx}`;
                if (linkedSet.has(key)) continue;
                linkedSet.add(key);
                linkRows.push([
                    `'${mainProjectId}'::uuid`,
                    `'${taskIds[i]}'::uuid`,
                    `'${taskIds[toIdx]}'::uuid`,
                    `'${pick(LINK_TYPES)}'`,
                ]);
            }
        }

        await bulkCopy(
            'task_link',
            ['fk_project_id', 'from_task_id', 'to_task_id', 'link_type'],
            linkRows,
        );
        console.log(`   ✓ ${linkRows.length.toLocaleString()} links (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 7. Materialized paths (depth-capped recursive CTE)
        // ----------------------------------------------------------
        console.log(`\n🥧 Baking materialized paths (depth cap: ${CONFIG.MATERIALIZATION_DEPTH_CAP})...`);
        await sql.raw(`
      INSERT INTO task_link_materialized
        (fk_project_id, origin_id, terminal_id, path_task_ids, path_link_types, depth)
      WITH RECURSIVE paths(origin_id, terminal_id, path_task_ids, path_link_types, depth) AS (
        SELECT
          from_task_id,
          to_task_id,
          ARRAY[from_task_id, to_task_id]::uuid[],
          ARRAY[link_type]::text[],
          1
        FROM task_link
        WHERE fk_project_id = '${mainProjectId}'::uuid

        UNION ALL

        SELECT
          tl.from_task_id,
          p.terminal_id,
          tl.from_task_id || p.path_task_ids,
          tl.link_type || p.path_link_types,
          p.depth + 1
        FROM task_link tl
        JOIN paths p ON tl.to_task_id = p.origin_id
        WHERE p.depth < ${CONFIG.MATERIALIZATION_DEPTH_CAP}
          AND tl.fk_project_id = '${mainProjectId}'::uuid
          AND NOT (tl.from_task_id = ANY(p.path_task_ids))  -- cycle guard
      )
      SELECT '${mainProjectId}'::uuid, origin_id, terminal_id, path_task_ids, path_link_types, depth
      FROM paths
      ON CONFLICT DO NOTHING
    `).execute(db);
        console.log(`   ✓ Materialization done (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 8. Extra lightweight projects
        // ----------------------------------------------------------
        console.log(`\n📁 Creating ${CONFIG.TOTAL_EXTRA_PROJECTS} extra projects...`);
        const extraProjectRows: string[][] = [];
        const extraMemberRows: string[][] = [];
        const extraTeamRows: string[][] = [];
        const extraTaskRows: string[][] = [];

        for (let p = 0; p < CONFIG.TOTAL_EXTRA_PROJECTS; p++) {
            const pid = uuidv4();
            const pname = (PROJECT_NAMES[p] ?? `Project ${p + 1}`).replace(/'/g, "''");
            const owner = pick(userIds);

            extraProjectRows.push([`'${pid}'::uuid`, `'${pname}'`, `'Lightweight project ${p + 1}.'`, `'${owner}'::uuid`]);

            // 20 random members
            const members = [...userIds].sort(() => Math.random() - 0.5).slice(0, 20);
            for (const uid of members) {
                extraMemberRows.push([`'${pid}'::uuid`, `'${uid}'::uuid`]);
            }

            // 5 teams
            for (let t = 0; t < 5; t++) {
                const tid = uuidv4();
                const tname = generateTeamName(t + 1).replace(/'/g, "''");
                extraTeamRows.push([`'${tid}'::uuid`, `'${pid}'::uuid`, `'${tname}'`, `'${owner}'::uuid`]);
            }

            // 50 tasks
            for (let k = 0; k < 50; k++) {
                const tkid = uuidv4();
                const title = generateTaskTitle().replace(/'/g, "''");
                const status = pickWeighted(TASK_STATUSES, STATUS_WEIGHTS);
                extraTaskRows.push([
                    `'${tkid}'::uuid`, `'${pid}'::uuid`, `'${title}'`,
                    `'Lightweight task.'`, `'${status}'`,
                    `'${adminId}'::uuid`, `'${adminId}'::uuid`,
                ]);
            }
        }

        await bulkCopy('project', ['id', 'name', 'description', 'fk_user_id'], extraProjectRows);
        await bulkCopy('project_member', ['fk_project_id', 'fk_user_id'], extraMemberRows);
        await bulkCopy('project_team', ['id', 'fk_project_id', 'name', 'fk_user_id'], extraTeamRows);
        await bulkCopy('project_task', ['id', 'fk_project_id', 'title', 'description', 'status', 'created_by', 'updated_by'], extraTaskRows);

        console.log(`   ✓ Extra projects done (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // Done
        // ----------------------------------------------------------
        const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n✅ Seeding complete in ${totalSecs}s`);
        console.log('📊 Summary:');
        console.log(`   Users    : ${CONFIG.TOTAL_USERS.toLocaleString()}`);
        console.log(`   Projects : ${1 + CONFIG.TOTAL_EXTRA_PROJECTS}`);
        console.log(`   Teams    : ${CONFIG.TOTAL_TEAMS.toLocaleString()} (main) + ${CONFIG.TOTAL_EXTRA_PROJECTS * 5} (extra)`);
        console.log(`   Tasks    : ${CONFIG.TOTAL_TASKS.toLocaleString()} (main) + ${CONFIG.TOTAL_EXTRA_PROJECTS * 50} (extra)`);
        console.log(`   Links    : ~${linkRows.length.toLocaleString()}`);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Seeding failed:', err);
        process.exit(1);
    }
}

function elapsed(t0: number): string {
    return `${((Date.now() - t0) / 1000).toFixed(1)}s`;
}

seed();