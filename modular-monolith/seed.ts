import { db } from './src/database';
import { sql } from 'kysely';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
//  ⚙️  CONFIGURATION — Tune all numbers here
// ============================================================
const CONFIG = {
    // Users
    TOTAL_USERS: 10_000,

    // Extra lightweight projects (besides the main stress-test one)
    TOTAL_EXTRA_PROJECTS: 5,

    // Main project — teams
    TOTAL_TEAMS: 500,
    MEMBERS_PER_TEAM: 150,          // sampled randomly from user pool

    // Main project — tasks
    TOTAL_TASKS: 200_000,

    // Forest / DAG shape
    // Tasks are split into isolated forests. Each forest is a DAG
    // with a controlled shape so materialisation never explodes.
    FOREST_COUNT: 50,               // how many separate sub-graphs
    FOREST_MAX_DEPTH: 20,            // max levels deep per forest
    FOREST_MAX_FANOUT: 5,            // max children per node
    // Remaining tasks (after forest assignment) become orphans (no links)

    // % of non-root nodes that also get a "cross-edge" within the same forest
    // (makes it a DAG rather than a pure tree — creates junction nodes)
    INTRA_FOREST_EXTRA_EDGE_RATIO: 0.15,

    // Materialization
    MATERIALIZATION_DEPTH_CAP: 100,  // per-forest CTE depth cap (safe: forests are small)
    FORESTS_PER_BATCH: 20,          // forests materialized per round-trip

    // Batch sizes
    COPY_BATCH_ROWS: 5_000,
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
    'Tariq', 'Fatima', 'Omar', 'Hassan', 'Nour', 'Zara', 'Yusuf', 'Aisha', 'Khalid', 'Leila',
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
const STATUS_WEIGHTS = [0.30, 0.25, 0.15, 0.20, 0.10];

const LINK_TYPES = ['Blocks', 'Relates', 'Duplicates'] as const;

// ============================================================
//  🛠️  Helpers
// ============================================================
function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickWeighted<T>(arr: readonly T[], weights: number[]): T {
    let r = Math.random(), c = 0;
    for (let i = 0; i < arr.length; i++) {
        c += weights[i]!;
        if (r < c) return arr[i]!;
    }
    return arr[arr.length - 1]!;
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function esc(s: string) { return s.replace(/'/g, "''"); }
function elapsed(t0: number) { return `${((Date.now() - t0) / 1000).toFixed(1)}s`; }

function generateUsername(first: string, last: string, suffix: number) {
    return `${first.toLowerCase()}.${last.toLowerCase()}${suffix}`;
}

function generateEmail(uname: string) {
    const domains = ['taskinator.io', 'devhive.co', 'workstream.dev', 'nexusapp.io', 'oriontech.com'];
    return `${uname}@${pick(domains)}`;
}

function generateTaskTitle() { return `${pick(TASK_VERBS)} ${pick(TASK_NOUNS)}`; }
function generateTeamName(i: number) { return `${pick(TEAM_PREFIXES)} ${pick(TEAM_SUFFIXES)} — Unit ${i}`; }

// ============================================================
//  ⚡  Bulk INSERT helper (batched)
// ============================================================
async function bulkInsert(table: string, columns: string[], rows: string[][]) {
    if (!rows.length) return;
    const cols = columns.join(', ');
    for (let offset = 0; offset < rows.length; offset += CONFIG.COPY_BATCH_ROWS) {
        const chunk = rows.slice(offset, offset + CONFIG.COPY_BATCH_ROWS);
        const values = chunk.map(r => `(${r.join(', ')})`).join(',\n');
        await sql.raw(`INSERT INTO ${table} (${cols}) VALUES ${values}`).execute(db);
    }
}

// ============================================================
//  🌳  Forest / DAG builder
//
//  Splits tasks into FOREST_COUNT isolated sub-graphs.
//  Within each forest:
//    Layer 0  → roots  (no parents, 1–4 outgoing links)
//    Layer 1+ → mid-nodes (parents + children)
//    Last layer → leaves (parents, no outgoing links)
//    Extra intra-forest edges → junction nodes (multiple parents)
//  No edges ever cross forest boundaries → path explosion impossible.
// ============================================================
interface ForestLink { from: string; to: string; type: string }

function buildForestLinks(forestTaskIds: string[]): ForestLink[] {
    const links: ForestLink[] = [];
    const n = forestTaskIds.length;
    if (n < 2) return links;

    const remaining = [...forestTaskIds];

    // Layer 0: roots
    const rootCount = Math.min(randomInt(1, 3), remaining.length);
    const layers: string[][] = [remaining.splice(0, rootCount)];

    // Build subsequent layers
    while (remaining.length > 0 && layers.length <= CONFIG.FOREST_MAX_DEPTH) {
        const parentLayer = layers[layers.length - 1]!;
        const layerNodes: string[] = [];

        for (const parent of parentLayer) {
            if (remaining.length === 0) break;
            const childCount = Math.min(randomInt(1, CONFIG.FOREST_MAX_FANOUT), remaining.length);
            for (let c = 0; c < childCount; c++) {
                const child = remaining.shift()!;
                layerNodes.push(child);
                links.push({ from: parent, to: child, type: pick(LINK_TYPES) });
            }
        }

        if (layerNodes.length === 0) break;
        layers.push(layerNodes);
    }

    // Overflow: any tasks that didn't fit in the depth budget
    // become extra leaves off random already-linked nodes
    const allLinked = layers.flat();
    for (const orphan of remaining) {
        const parent = allLinked[randomInt(0, allLinked.length - 1)]!;
        links.push({ from: parent, to: orphan, type: pick(LINK_TYPES) });
        allLinked.push(orphan);
    }

    // Extra intra-forest edges → junction nodes (multiple parents, DAG not just tree)
    // Only forward edges (lower index → higher index) to guarantee no cycles
    const linkedSet = new Set(links.map(l => `${l.from}-${l.to}`));
    const extraCount = Math.floor(n * CONFIG.INTRA_FOREST_EXTRA_EDGE_RATIO);

    for (let e = 0; e < extraCount; e++) {
        const fi = randomInt(0, forestTaskIds.length - 2);
        const ti = randomInt(fi + 1, forestTaskIds.length - 1);
        const key = `${forestTaskIds[fi]}-${forestTaskIds[ti]}`;
        if (linkedSet.has(key)) continue;
        linkedSet.add(key);
        links.push({ from: forestTaskIds[fi]!, to: forestTaskIds[ti]!, type: pick(LINK_TYPES) });
    }

    return links;
}

// ============================================================
//  🌱  SEED
// ============================================================
async function seed() {
    const t0 = Date.now();
    console.log('🚀 Starting Hyper-Scale Forest Seeding...');
    console.log('📋 Config:', JSON.stringify(CONFIG, null, 2));

    try {
        // ----------------------------------------------------------
        // 1. Truncate (correct FK order per schema)
        // ----------------------------------------------------------
        console.log('\n🧹 Truncating old data...');
        for (const t of [
            'task_reachability', 'task_link', 'project_task',
            'project_team_member', 'project_member', 'project_team', 'project', 'users',
        ]) await sql.raw(`TRUNCATE TABLE ${t} CASCADE`).execute(db);
        console.log(`   ✓ Done (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 2. Users
        // ----------------------------------------------------------
        console.log(`\n👤 Generating ${CONFIG.TOTAL_USERS.toLocaleString()} users...`);
        const passwordHash = await Bun.password.hash('password');
        const adminId = uuidv4();

        await sql`
      INSERT INTO users (id, email, username, password_hash)
      VALUES (${adminId}::uuid, 'admin@taskinator.io', 'admin', ${passwordHash})
    `.execute(db);

        const userIds: string[] = [adminId];
        const userRows: string[][] = [];

        for (let i = 1; i < CONFIG.TOTAL_USERS; i++) {
            const id = uuidv4();
            const first = pick(FIRST_NAMES);
            const last = pick(LAST_NAMES);
            const uname = generateUsername(first, last, i);
            userIds.push(id);
            userRows.push([
                `'${id}'::uuid`,
                `'${esc(generateEmail(uname))}'`,
                `'${esc(uname)}'`,
                `'${passwordHash}'`,
            ]);
        }

        await bulkInsert('users', ['id', 'email', 'username', 'password_hash'], userRows);
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
        // fk_user_id is TEXT in schema (not UUID)
        await bulkInsert(
            'project_member',
            ['fk_project_id', 'fk_user_id'],
            userIds.map(uid => [`'${mainProjectId}'::uuid`, `'${uid}'`]),
        );

        // ----------------------------------------------------------
        // 3.1. Starter Demo Project (Deterministic)
        // ----------------------------------------------------------
        console.log('\n🌟 Creating Starter Demo Project...');
        const starterProjectId = 'd3b10564-f9c8-43fe-bcad-c78a14b3feb0'; // Deterministic ID
        const starterTaskIds = {
            concept: 'c1b10564-f9c8-43fe-bcad-c78a14b3feb0',
            arch: 'a2b10564-f9c8-43fe-bcad-c78a14b3feb0',
            api: 'a3b10564-f9c8-43fe-bcad-c78a14b3feb0',
            ui: 'f4b10564-f9c8-43fe-bcad-c78a14b3feb0',
            test: 'e5b10564-f9c8-43fe-bcad-c78a14b3feb0'
        };

        await sql`
            INSERT INTO project (id, name, description, fk_user_id)
            VALUES (${starterProjectId}::uuid, 'Product Launch 2026', 'A deterministic showcase of the Taskinator reachability engine.', ${adminId})
            ON CONFLICT (id) DO NOTHING
        `.execute(db);

        await sql`INSERT INTO project_member (fk_project_id, fk_user_id) VALUES (${starterProjectId}::uuid, ${adminId}) ON CONFLICT DO NOTHING`.execute(db);

        const starterTaskRows = [
            [`'${starterTaskIds.concept}'::uuid`, `'${starterProjectId}'::uuid`, `NULL`, `'${adminId}'`, `'Concept Development'`, `'Define the north star vision and core user personas.'`, `'DONE'`, `'${adminId}'`, `'${adminId}'`],
            [`'${starterTaskIds.arch}'::uuid`, `'${starterProjectId}'::uuid`, `NULL`, `'${adminId}'`, `'Architecture Design'`, `'System design, GraphQL schema and database indexing strategy.'`, `'IN_PROGRESS'`, `'${adminId}'`, `'${adminId}'`],
            [`'${starterTaskIds.api}'::uuid`, `'${starterProjectId}'::uuid`, `NULL`, `'${adminId}'`, `'API Implementation'`, `'Building the Yoga GraphQL server and Kysely adapters.'`, `'TODO'`, `'${adminId}'`, `'${adminId}'`],
            [`'${starterTaskIds.ui}'::uuid`, `'${starterProjectId}'::uuid`, `NULL`, `'${adminId}'`, `'Frontend Integration'`, `'Connecting the React app to the live GraphQL stream.'`, `'TODO'`, `'${adminId}'`, `'${adminId}'`],
            [`'${starterTaskIds.test}'::uuid`, `'${starterProjectId}'::uuid`, `NULL`, `'${adminId}'`, `'E2E Verification'`, `'Final regression tests and performance benchmarking.'`, `'TODO'`, `'${adminId}'`, `'${adminId}'`]
        ];

        await bulkInsert('project_task', ['id', 'fk_project_id', 'fk_team_id', 'fk_member_id', 'title', 'description', 'status', 'created_by', 'updated_by'], starterTaskRows);

        const starterLinkRows = [
            [`'${uuidv4()}'::uuid`, `'${starterProjectId}'::uuid`, `'${starterTaskIds.concept}'::uuid`, `'${starterTaskIds.arch}'::uuid`, `'Blocks'`, `'${adminId}'`],
            [`'${uuidv4()}'::uuid`, `'${starterProjectId}'::uuid`, `'${starterTaskIds.arch}'::uuid`, `'${starterTaskIds.api}'::uuid`, `'Relates'`, `'${adminId}'`],
            [`'${uuidv4()}'::uuid`, `'${starterProjectId}'::uuid`, `'${starterTaskIds.api}'::uuid`, `'${starterTaskIds.ui}'::uuid`, `'Blocks'`, `'${adminId}'`],
            [`'${uuidv4()}'::uuid`, `'${starterProjectId}'::uuid`, `'${starterTaskIds.ui}'::uuid`, `'${starterTaskIds.test}'::uuid`, `'Blocks'`, `'${adminId}'`]
        ];

        await bulkInsert('task_link', ['id', 'fk_project_id', 'source_task_id', 'target_task_id', 'label', 'created_by'], starterLinkRows);
        console.log(`   ✓ ${userIds.length.toLocaleString()} members (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 4. Teams
        // ----------------------------------------------------------
        console.log(`\n🛡 Creating ${CONFIG.TOTAL_TEAMS.toLocaleString()} teams...`);
        const teamIds: string[] = [];
        const teamRows: string[][] = [];

        for (let i = 1; i <= CONFIG.TOTAL_TEAMS; i++) {
            const id = uuidv4();
            teamIds.push(id);
            // Schema column order: id, name, fk_project_id, fk_user_id
            teamRows.push([
                `'${id}'::uuid`,
                `'${esc(generateTeamName(i))}'`,
                `'${mainProjectId}'::uuid`,
                `'${adminId}'`,           // fk_user_id is TEXT
            ]);
        }

        await bulkInsert('project_team', ['id', 'name', 'fk_project_id', 'fk_user_id'], teamRows);
        console.log(`   ✓ ${teamIds.length.toLocaleString()} teams (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 5. Team members
        // ----------------------------------------------------------
        console.log(`\n👥 Assigning ~${CONFIG.MEMBERS_PER_TEAM} members per team...`);
        const teamMemberRows: string[][] = [];
        const teamMembersById = new Map<string, string[]>();

        for (const teamId of teamIds) {
            // Fisher-Yates partial shuffle (much faster than .sort(() => random))
            const pool = [...userIds];
            const count = Math.min(CONFIG.MEMBERS_PER_TEAM, pool.length);
            for (let i = 0; i < count; i++) {
                const j = i + Math.floor(Math.random() * (pool.length - i));
                [pool[i], pool[j]] = [pool[j]!, pool[i]!];
            }
            teamMembersById.set(teamId, pool.slice(0, count));
            for (let i = 0; i < count; i++) {
                teamMemberRows.push([
                    `'${mainProjectId}'::uuid`,
                    `'${teamId}'::uuid`,
                    `'${pool[i]}'`,         // fk_user_id is TEXT
                ]);
            }
        }

        await bulkInsert(
            'project_team_member',
            ['fk_project_id', 'fk_team_id', 'fk_user_id'],
            teamMemberRows,
        );
        console.log(`   ✓ ${teamMemberRows.length.toLocaleString()} team-member rows (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 6. Tasks
        // ----------------------------------------------------------
        console.log(`\n📋 Creating ${CONFIG.TOTAL_TASKS.toLocaleString()} tasks...`);
        const taskIds: string[] = [];
        const taskRows: string[][] = [];

        for (let i = 0; i < CONFIG.TOTAL_TASKS; i++) {
            const id = uuidv4();
            const title = esc(generateTaskTitle());
            const status = pickWeighted(TASK_STATUSES, STATUS_WEIGHTS);
            const teamId = pick(teamIds);
            const memberPool = teamMembersById.get(teamId) ?? userIds;
            const memberId = pick(memberPool);
            taskIds.push(id);
            taskRows.push([
                `'${id}'::uuid`,
                `'${mainProjectId}'::uuid`,
                `'${teamId}'::uuid`,
                `'${memberId}'`,           // fk_member_id is TEXT
                `'${title}'`,
                `'Auto-generated stress task #${i + 1}.'`,
                `'${status}'`,
                `'${adminId}'`,            // created_by is TEXT
                `'${adminId}'`,            // updated_by is TEXT
            ]);
        }

        await bulkInsert(
            'project_task',
            ['id', 'fk_project_id', 'fk_team_id', 'fk_member_id',
                'title', 'description', 'status', 'created_by', 'updated_by'],
            taskRows,
        );
        console.log(`   ✓ ${taskIds.length.toLocaleString()} tasks (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 7. Forest-based DAG links
        //
        //  Split tasks into FOREST_COUNT buckets.
        //  Each bucket = one isolated DAG (zero cross-forest edges).
        //
        //  Node roles across all forests (approximate):
        //    ~10% roots       — no incoming links, 1–4 outgoing
        //    ~40% mid-nodes   — has parents AND children
        //    ~10% junctions   — multiple parents AND multiple children
        //    ~30% leaves      — has parents, no outgoing links
        //    ~10% orphans     — zero links (forests that were size 1)
        // ----------------------------------------------------------
        console.log(`\n🔗 Building ${CONFIG.FOREST_COUNT} isolated DAG forests...`);

        // Shuffle so forests contain a random mix of task IDs (not sequential)
        const shuffled = [...taskIds].sort(() => Math.random() - 0.5);
        const forestSize = Math.floor(shuffled.length / CONFIG.FOREST_COUNT);
        const forests: string[][] = [];

        for (let f = 0; f < CONFIG.FOREST_COUNT; f++) {
            const start = f * forestSize;
            const end = f === CONFIG.FOREST_COUNT - 1 ? shuffled.length : start + forestSize;
            forests.push(shuffled.slice(start, end));
        }

        const allLinkRows: string[][] = [];
        let totalLinks = 0;

        for (const forest of forests) {
            const links = buildForestLinks(forest);
            for (const link of links) {
                const linkId = uuidv4();
                allLinkRows.push([
                    `'${linkId}'::uuid`,
                    `'${mainProjectId}'::uuid`,
                    `'${link.from}'::uuid`,
                    `'${link.to}'::uuid`,
                    `'${link.type}'`,
                    `'${adminId}'`,
                ]);
            }
            totalLinks += links.length;
        }

        await bulkInsert(
            'task_link',
            ['id', 'fk_project_id', 'source_task_id', 'target_task_id', 'label', 'created_by'],
            allLinkRows,
        );
        console.log(`   ✓ ${totalLinks.toLocaleString()} links across ${CONFIG.FOREST_COUNT} forests (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 8. Reachability Index — per-forest batched CTE
        // ----------------------------------------------------------
        console.log(`\n🥧 Generating reachability index (per-forest, depth cap ${CONFIG.MATERIALIZATION_DEPTH_CAP})...`);

        let reachabilityCreated = 0;

        for (let f = 0; f < forests.length; f++) {
            const forest = forests[f]!;
            if (forest.length < 2) { reachabilityCreated++; continue; }

            const idList = forest.map(id => `'${id}'::uuid`).join(',');

            await sql.raw(`
                INSERT INTO task_reachability
                    (fk_project_id, ancestor_task_id, descendant_task_id, min_depth, path_count)
                WITH RECURSIVE paths(anc, trg, depth) AS (
                    SELECT source_task_id, target_task_id, 1
                    FROM task_link
                    WHERE fk_project_id = '${mainProjectId}'::uuid
                        AND source_task_id IN (${idList})
                        AND target_task_id IN (${idList})
                    UNION ALL
                    SELECT p.anc, tl.target_task_id, p.depth + 1
                    FROM task_link tl
                    JOIN paths p ON tl.source_task_id = p.trg
                    WHERE tl.fk_project_id = '${mainProjectId}'::uuid
                        AND tl.source_task_id IN (${idList})
                        AND tl.target_task_id IN (${idList})
                        AND p.depth < ${CONFIG.MATERIALIZATION_DEPTH_CAP}
                )
                SELECT 
                    '${mainProjectId}'::uuid,
                    anc,
                    trg,
                    MIN(depth),
                    COUNT(*)
                FROM paths
                GROUP BY anc, trg
                ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id) DO NOTHING
            `).execute(db);

            reachabilityCreated++;
            if (reachabilityCreated % 50 === 0 || reachabilityCreated === forests.length) {
                const pct = Math.round((reachabilityCreated / forests.length) * 100);
                process.stdout.write(`\r   ↻ ${reachabilityCreated}/${forests.length} forests (${pct}%) — ${elapsed(t0)}   `);
            }
        }
        console.log(`\n   ✓ All ${reachabilityCreated} forests reach-indexed (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // 8.1. Materialize Starter Project Reachability
        // ----------------------------------------------------------
        console.log(`\n🥧 Generating Starter Project reachability...`);
        await sql.raw(`
            INSERT INTO task_reachability (fk_project_id, ancestor_task_id, descendant_task_id, min_depth, path_count)
            WITH RECURSIVE paths(anc, trg, depth) AS (
              SELECT source_task_id, target_task_id, 1
              FROM task_link WHERE fk_project_id = '${starterProjectId}'::uuid
              UNION ALL
              SELECT p.anc, tl.target_task_id, p.depth + 1
              FROM task_link tl JOIN paths p ON tl.source_task_id = p.trg
              WHERE tl.fk_project_id = '${starterProjectId}'::uuid AND p.depth < 10
            )
            SELECT '${starterProjectId}'::uuid, anc, trg, MIN(depth), COUNT(*) FROM paths GROUP BY anc, trg
            ON CONFLICT (fk_project_id, ancestor_task_id, descendant_task_id) DO NOTHING
        `).execute(db);

        // ----------------------------------------------------------
        // 9. Extra lightweight projects
        // ----------------------------------------------------------
        console.log(`\n📁 Creating ${CONFIG.TOTAL_EXTRA_PROJECTS} extra projects...`);
        const extraProjectRows: string[][] = [];
        const extraMemberRows: string[][] = [];
        const extraTeamRows: string[][] = [];
        const extraTaskRows: string[][] = [];

        for (let p = 0; p < CONFIG.TOTAL_EXTRA_PROJECTS; p++) {
            const pid = uuidv4();
            const pname = esc(PROJECT_NAMES[p] ?? `Project ${p + 1}`);
            const owner = pick(userIds);

            extraProjectRows.push([
                `'${pid}'::uuid`, `'${pname}'`, `'Lightweight project ${p + 1}.'`, `'${owner}'`,
            ]);

            // 20 random members
            const pool = [...userIds].sort(() => Math.random() - 0.5).slice(0, 20);
            for (const uid of pool) extraMemberRows.push([`'${pid}'::uuid`, `'${uid}'`]);

            // 5 teams
            for (let t = 0; t < 5; t++) {
                const tid = uuidv4();
                const tname = esc(generateTeamName(t + 1));
                extraTeamRows.push([`'${tid}'::uuid`, `'${tname}'`, `'${pid}'::uuid`, `'${owner}'`]);
            }

            // 50 tasks (no links — keeps extra projects fast)
            for (let k = 0; k < 50; k++) {
                const tkid = uuidv4();
                const title = esc(generateTaskTitle());
                const status = pickWeighted(TASK_STATUSES, STATUS_WEIGHTS);
                extraTaskRows.push([
                    `'${tkid}'::uuid`,
                    `'${pid}'::uuid`,
                    `NULL`,              // fk_team_id nullable
                    `'${owner}'`,        // fk_member_id TEXT
                    `'${title}'`,
                    `'Lightweight task.'`,
                    `'${status}'`,
                    `'${owner}'`,
                    `'${owner}'`,
                ]);
            }
        }

        await bulkInsert('project', ['id', 'name', 'description', 'fk_user_id'], extraProjectRows);
        await bulkInsert('project_member', ['fk_project_id', 'fk_user_id'], extraMemberRows);
        await bulkInsert('project_team', ['id', 'name', 'fk_project_id', 'fk_user_id'], extraTeamRows);
        await bulkInsert('project_task', ['id', 'fk_project_id', 'fk_team_id', 'fk_member_id', 'title', 'description', 'status', 'created_by', 'updated_by'], extraTaskRows);

        console.log(`   ✓ Extra projects done (${elapsed(t0)})`);

        // ----------------------------------------------------------
        // Done
        // ----------------------------------------------------------
        const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n✅ Seeding complete in ${totalSecs}s`);
        console.log('📊 Summary:');
        console.log(`   Users            : ${CONFIG.TOTAL_USERS.toLocaleString()}`);
        console.log(`   Projects         : ${1 + CONFIG.TOTAL_EXTRA_PROJECTS}`);
        console.log(`   Teams (main)     : ${CONFIG.TOTAL_TEAMS.toLocaleString()}`);
        console.log(`   Team members     : ${teamMemberRows.length.toLocaleString()}`);
        console.log(`   Tasks (main)     : ${CONFIG.TOTAL_TASKS.toLocaleString()}`);
        console.log(`   Task links       : ${totalLinks.toLocaleString()}`);
        console.log(`   Forests          : ${CONFIG.FOREST_COUNT}`);
        console.log(`   Avg tasks/forest : ~${Math.round(CONFIG.TOTAL_TASKS / CONFIG.FOREST_COUNT)}`);
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
