/**
 * ============================================================
 *  📦 VOLUME SEED — GraphQL API Seeder
 *  Talks directly to the live server via HTTP fetch.
 *  Run: bun run src/tests/e2e/scripts/volume-seed.ts
 * ============================================================
 *
 *  VARIABLES  (all defaults are "huge" for volume/read testing)
 *
 *  X  TOTAL_USERS           — users to create
 *  Y  PROJECTS_PER_OWNER    — projects each "owner" user creates (random range)
 *  Z  MEMBERS_PER_PROJECT   — random project members per project
 *  N  TEAMS_PER_PROJECT     — teams per project
 *  B  TEAM_MEMBERS_MIN      — min members per team  (sampled from project members)
 *  C  TEAM_MEMBERS_MAX      — max members per team
 *  D  TASKS_PER_PROJECT     — tasks per project
 *  E  LINK_DEPTH_MIN        — min DAG depth per sub-graph
 *  F  LINK_DEPTH_MAX        — max DAG depth per sub-graph
 *  G  LINKED_TASK_PCT       — % of tasks that participate in a link sub-graph (0-100)
 *  CONCURRENCY              — parallel in-flight GQL calls at once
 */

// ============================================================
//  ⚙️  CONFIGURATION
// ============================================================
const CFG = {
    GQL_URL: process.env.GQL_URL || 'http://localhost:3000/graphql',
    OWNER_COUNT: 1, // how many "owner" accounts to create
    TOTAL_USERS: 1, // X — total users (includes owners)
    PROJECTS_PER_OWNER_MIN: 200, // Y_min (random projects per owner)
    PROJECTS_PER_OWNER_MAX: 500, // Y_max
    MEMBERS_PER_PROJECT_MIN: 10, // Z_min  (random members per project)
    MEMBERS_PER_PROJECT_MAX: 20, // Z_max
    TEAMS_PER_PROJECT_MIN: 4, // N_min  (random teams per project)
    TEAMS_PER_PROJECT_MAX: 10, // N_max
    TEAM_MEMBERS_MIN: 5, // B
    TEAM_MEMBERS_MAX: 50, // C
    TASKS_PER_PROJECT_MIN: 100, // D_min  (random tasks per project)
    TASKS_PER_PROJECT_MAX: 1000, // D_max
    LINK_DEPTH_MIN: 10, // E
    LINK_DEPTH_MAX: 50, // F
    LINKED_TASK_PCT: 90, // G  (percent of tasks in link graphs)
    CONCURRENCY: 50, // parallel GQL calls
    PASSWORD: '123',
} as const;

// ============================================================
//  🎨  DATA POOLS
// ============================================================
const FIRST = [
    'Liam',
    'Noah',
    'Oliver',
    'Elijah',
    'James',
    'William',
    'Benjamin',
    'Lucas',
    'Henry',
    'Alexander',
    'Emma',
    'Olivia',
    'Ava',
    'Isabella',
    'Sophia',
    'Charlotte',
    'Amelia',
    'Mia',
    'Harper',
    'Evelyn',
    'Aiden',
    'Jackson',
    'Sebastian',
    'Mateo',
    'Jack',
    'Owen',
    'Theodore',
    'Amir',
    'Ethan',
    'Leo',
    'Aria',
    'Luna',
    'Chloe',
    'Penelope',
    'Layla',
    'Riley',
    'Zoey',
    'Nora',
    'Lily',
    'Eleanor',
    'Rohan',
    'Priya',
    'Arjun',
    'Ananya',
    'Vikram',
    'Divya',
    'Karan',
    'Sneha',
    'Rahul',
    'Pooja',
    'Wei',
    'Xiao',
    'Ming',
    'Jing',
    'Lei',
    'Fang',
    'Yan',
    'Qiang',
    'Hui',
    'Ling',
    'Tariq',
    'Fatima',
    'Omar',
    'Hassan',
    'Nour',
    'Zara',
    'Yusuf',
    'Aisha',
    'Khalid',
    'Leila',
    'Hiroshi',
    'Yuki',
    'Kenji',
    'Aiko',
    'Takeshi',
    'Sakura',
    'Ryu',
    'Hana',
    'Sora',
    'Rin',
];

const LAST = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Wilson',
    'Taylor',
    'Anderson',
    'Thomas',
    'Jackson',
    'White',
    'Harris',
    'Martin',
    'Thompson',
    'Robinson',
    'Clark',
    'Lewis',
    'Patel',
    'Shah',
    'Kumar',
    'Singh',
    'Sharma',
    'Gupta',
    'Mehta',
    'Joshi',
    'Rao',
    'Nair',
    'Chen',
    'Wang',
    'Li',
    'Zhang',
    'Liu',
    'Yang',
    'Huang',
    'Zhao',
    'Wu',
    'Zhou',
    'Ahmed',
    'Ali',
    'Khan',
    'Hassan',
    'Ibrahim',
    'Mohammed',
    'Abdullah',
    'Rahman',
    'Siddiqui',
    'Malik',
    'Müller',
    'Schmidt',
    'Schneider',
    'Fischer',
    'Weber',
    'Meyer',
    'Wagner',
    'Becker',
    'Schulz',
    'Hoffmann',
    'Tanaka',
    'Suzuki',
    'Watanabe',
    'Ito',
    'Yamamoto',
    'Nakamura',
    'Kobayashi',
    'Kato',
    'Saito',
    'Yamada',
];

const DOMAINS = [
    'taskinator.io',
    'devhive.co',
    'workstream.dev',
    'nexusapp.io',
    'oriontech.com',
    'stacklabs.io',
    'buildfast.dev',
    'codeflow.co',
    'deployify.io',
    'gitops.dev',
];

const PROJECT_ADJECTIVES = [
    'Nexus',
    'Atlas',
    'Orion',
    'Helix',
    'Prism',
    'Vertex',
    'Quantum',
    'Aurora',
    'Zenith',
    'Cipher',
    'Eclipse',
    'Polaris',
    'Nova',
    'Titan',
    'Specter',
    'Apex',
    'Cobalt',
    'Meridian',
    'Obsidian',
    'Stratos',
    'Vortex',
    'Cascade',
    'Ember',
    'Flux',
    'Glacier',
    'Harbor',
    'Iris',
    'Jade',
    'Kinetic',
    'Lumen',
    'Mirage',
    'Nimbus',
    'Onyx',
    'Pinnacle',
    'Quartz',
    'Radiant',
    'Sapphire',
];

const PROJECT_NOUNS = [
    'Core',
    'Platform',
    'Suite',
    'Engine',
    'Gateway',
    'Cloud',
    'Mesh',
    'Stack',
    'Hub',
    'Network',
    'Runtime',
    'Grid',
    'Fabric',
    'Cluster',
    'API',
    'Forge',
    'Pipeline',
    'OS',
    'Console',
    'Layer',
    'DB',
    'UI',
    'Framework',
    'Monitor',
    'Store',
    'Registry',
    'Workflow',
    'Scheduler',
    'Auth',
    'CDN',
];

const TEAM_PREFIXES = [
    'Kernel',
    'Security',
    'Edge',
    'Cloud',
    'Data',
    'Platform',
    'DevOps',
    'Infrastructure',
    'Frontend',
    'Backend',
    'Mobile',
    'AI/ML',
    'QA',
    'Reliability',
    'Networking',
    'Compliance',
    'Identity',
    'Payments',
    'Search',
    'Streaming',
    'Storage',
    'Monitoring',
    'Billing',
    'Growth',
    'Localization',
];

const TEAM_SUFFIXES = [
    'Alpha',
    'Bravo',
    'Charlie',
    'Delta',
    'Echo',
    'Foxtrot',
    'Gamma',
    'Horizon',
    'Ignite',
    'Jade',
    'Kilo',
    'Lima',
    'Maven',
    'Nova',
    'Omega',
    'Phoenix',
    'Quantum',
    'Raptor',
    'Sigma',
    'Titan',
];

const TASK_VERBS = [
    'Implement',
    'Refactor',
    'Fix',
    'Optimize',
    'Deploy',
    'Migrate',
    'Review',
    'Test',
    'Document',
    'Audit',
    'Debug',
    'Monitor',
    'Integrate',
    'Configure',
    'Update',
    'Design',
    'Architect',
    'Benchmark',
    'Investigate',
    'Prototype',
    'Validate',
    'Automate',
    'Scale',
    'Harden',
    'Profile',
];

const TASK_NOUNS = [
    'authentication flow',
    'API rate limiter',
    'database indexing',
    'CI/CD pipeline',
    'cache eviction policy',
    'WebSocket handler',
    'OAuth2 integration',
    'gRPC endpoints',
    'Kafka consumers',
    'Redis cluster',
    'S3 lifecycle rules',
    'GraphQL resolvers',
    'JWT refresh logic',
    'Elasticsearch mapping',
    'load balancer config',
    'TLS certificates',
    'feature flags',
    'A/B test framework',
    'metrics dashboard',
    'alert thresholds',
    'data retention policy',
    'audit logs',
    'user onboarding',
    'payment gateway',
    'RBAC permissions',
    'multi-tenancy layer',
    'dark mode support',
    'mobile deep links',
    'search ranking',
    'recommendation engine',
    'billing cycle',
    'SSO provider',
    'service mesh config',
    'secrets rotation',
    'backup strategy',
    'disaster recovery',
    'capacity planning',
    'SLA monitoring',
    'cost attribution',
    'observability pipeline',
    'chaos engineering',
    'synthetic monitoring',
    'canary deployment',
];

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
const STATUS_WEIGHTS = [0.3, 0.25, 0.15, 0.2, 0.1];
const LINK_LABELS = [
    'Blocks',
    'Relates',
    'Duplicates',
    'Depends On',
    'Implements',
];

// ============================================================
//  🛠️  HELPERS
// ============================================================
function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}
function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function elapsed(t0: number) {
    return `${((Date.now() - t0) / 1000).toFixed(1)}s`;
}
function esc(s: string) {
    return s.replace(/['"]/g, '_');
}

function pickWeighted<T>(arr: readonly T[], weights: number[]): T {
    let r = Math.random(),
        c = 0;
    for (let i = 0; i < arr.length; i++) {
        c += weights[i]!;
        if (r < c) return arr[i]!;
    }
    return arr[arr.length - 1]!;
}

/** Fisher-Yates partial shuffle — returns n random items without full sort */
function sampleN<T>(arr: T[], n: number): T[] {
    const pool = [...arr];
    const count = Math.min(n, pool.length);
    for (let i = 0; i < count; i++) {
        const j = i + randomInt(0, pool.length - i - 1);
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, count);
}

function generateEmail(first: string, last: string, idx: number): string {
    const u = `${first.toLowerCase()}.${last.toLowerCase()}${idx}`;
    return `${esc(u)}@${pick(DOMAINS)}`;
}
function generateUsername(first: string, last: string, idx: number): string {
    return esc(`${first.toLowerCase()}.${last.toLowerCase()}${idx}`);
}
function generateProjectName(): string {
    return `${pick(PROJECT_ADJECTIVES)} ${pick(PROJECT_NOUNS)}`;
}
function generateTeamName(i: number): string {
    return `${pick(TEAM_PREFIXES)} ${pick(TEAM_SUFFIXES)} — Unit ${i}`;
}
function generateTaskTitle(): string {
    return `${pick(TASK_VERBS)} ${pick(TASK_NOUNS)}`;
}
function generateTaskDesc(title: string): string {
    return `Task: ${title}. Auto-generated for volume testing.`;
}

// ============================================================
//  🌐  GQL CLIENT
// ============================================================
async function gql<T = any>(
    query: string,
    variables: Record<string, any>,
    token?: string,
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(CFG.GQL_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
    });

    const json = (await res.json()) as any;
    if (json.errors) {
        const msg = json.errors[0]?.message || JSON.stringify(json.errors);
        throw new Error(`GQL Error: ${msg}`);
    }
    return json.data as T;
}

/** Run at most `limit` promises concurrently */
async function pLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
): Promise<T[]> {
    const results: T[] = [];
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            results[i] = await tasks[i]!();
        }
    }
    const workers = Array.from(
        { length: Math.min(limit, tasks.length) },
        worker,
    );
    await Promise.all(workers);
    return results;
}

// ============================================================
//  📝  MUTATIONS
// ============================================================
const M_SIGN_UP = `mutation($email:String!,$username:String!,$pw:String!){signUp(email:$email,username:$username,password_raw:$pw)}`;
const M_SIGN_IN = `mutation($email:String!,$pw:String!){signIn(email:$email,password_raw:$pw){token}}`;
const M_CREATE_PROJECT = `mutation($name:String!,$desc:String){createProject(name:$name,description:$desc){id}}`;
const M_ADD_PROJECT_MEMBERS = `mutation($pid:ID!,$uids:[ID!]!){addProjectMembers(projectId:$pid,userIds:$uids){success}}`;
const M_CREATE_TEAM = `mutation($pid:ID!,$name:String!){createTeam(projectId:$pid,name:$name){team{id}}}`;
const M_ADD_TEAM_MEMBERS = `mutation($pid:ID!,$tid:ID!,$uids:[ID!]!){addTeamMembers(projectId:$pid,teamId:$tid,userIds:$uids){addedCount}}`;
const M_CREATE_TASK = `mutation($input:CreateTaskInput!){task{create(input:$input){id version}}}`;
const M_UPDATE_TASK = `mutation($tid:ID!,$input:UpdateTaskInput!){task{update(taskId:$tid,input:$input){id}}}`;
const M_CREATE_LINK = `mutation($input:CreateTaskLinkInput!){task{createLink(input:$input){id}}}`;

// ============================================================
//  🌱  MAIN SEED
// ============================================================
async function seed() {
    const t0 = Date.now();
    console.log('🚀 Volume Seed starting…');
    console.log('📋 Config:', JSON.stringify(CFG, null, 2));
    console.log(`🌐 Target: ${CFG.GQL_URL}\n`);

    // ── 1. CREATE ALL USERS ─────────────────────────────────────
    console.log(`👤 Creating ${CFG.TOTAL_USERS} users…`);
    const users: {
        id?: string;
        email: string;
        username: string;
        token?: string;
    }[] = [];

    // Deterministic email sequence: 0→a@a.a, 1→b@a.a, …, 25→z@a.a, 26→aa@a.a
    const toSeq = (n: number): string => {
        let r = '';
        let cur = n;
        while (cur >= 0) {
            r = String.fromCharCode(97 + (cur % 26)) + r;
            cur = Math.floor(cur / 26) - 1;
        }
        return r;
    };

    for (let i = 0; i < CFG.TOTAL_USERS; i++) {
        const seq = toSeq(i);
        const first = pick(FIRST);
        const last = pick(LAST);
        users.push({
            email: `${seq}@a.a`,
            username: `${first.toLowerCase()}.${last.toLowerCase()}${i}`,
        });
    }

    // Sign up in parallel batches
    await pLimit(
        users.map((u) => async () => {
            try {
                await gql(M_SIGN_UP, {
                    email: u.email,
                    username: u.username,
                    pw: CFG.PASSWORD,
                });
            } catch {
                // already exists — ignore
            }
        }),
        CFG.CONCURRENCY,
    );

    // Sign in the first OWNER_COUNT users to get tokens (owners create projects)
    await pLimit(
        users.slice(0, CFG.OWNER_COUNT).map((u) => async () => {
            const d = await gql<{ signIn: { token: string } }>(M_SIGN_IN, {
                email: u.email,
                pw: CFG.PASSWORD,
            });
            u.token = d.signIn.token;
        }),
        CFG.CONCURRENCY,
    );

    // Sign in ALL users for member IDs — we need their IDs for member assignment
    // The server returns id in the token payload; decode it cheaply
    await pLimit(
        users.map((u) => async () => {
            if (u.token) return; // owner already done
            const d = await gql<{ signIn: { token: string } }>(M_SIGN_IN, {
                email: u.email,
                pw: CFG.PASSWORD,
            });
            u.token = d.signIn.token;
        }),
        CFG.CONCURRENCY,
    );

    // Decode user IDs from JWT payload (base64 middle segment)
    const decodeId = (token: string): string => {
        try {
            const payload = JSON.parse(
                Buffer.from(token.split('.')[1]!, 'base64').toString(),
            );
            return payload.id as string;
        } catch {
            return '';
        }
    };

    for (const u of users) {
        if (u.token) u.id = decodeId(u.token);
    }

    const allUserIds = users.map((u) => u.id!).filter(Boolean);
    console.log(`   ✓ ${allUserIds.length} users ready  (${elapsed(t0)})\n`);

    // ── 2. CREATE PROJECTS ──────────────────────────────────────
    console.log(
        `🏢 Creating ${CFG.PROJECTS_PER_OWNER_MIN}–${CFG.PROJECTS_PER_OWNER_MAX} projects per owner (${CFG.OWNER_COUNT} owners)…`,
    );

    type ProjectCtx = {
        id: string;
        ownerToken: string;
        ownerUserId: string;
        memberIds: string[];
        teamIds: string[];
        teamMemberMap: Map<string, string[]>; // teamId → [userId]
        taskIds: string[];
    };

    const projects: ProjectCtx[] = [];

    const projectTasks: (() => Promise<void>)[] = [];
    for (let oi = 0; oi < CFG.OWNER_COUNT; oi++) {
        const owner = users[oi]!;
        const numProjects = randomInt(
            CFG.PROJECTS_PER_OWNER_MIN,
            CFG.PROJECTS_PER_OWNER_MAX,
        );
        for (let pi = 0; pi < numProjects; pi++) {
            projectTasks.push(async () => {
                const name = generateProjectName();
                const d = await gql<{ createProject: { id: string } }>(
                    M_CREATE_PROJECT,
                    { name, desc: `Volume test project — ${name}` },
                    owner.token,
                );
                projects.push({
                    id: d.createProject.id,
                    ownerToken: owner.token!,
                    ownerUserId: owner.id!,
                    memberIds: [],
                    teamIds: [],
                    teamMemberMap: new Map(),
                    taskIds: [],
                });
            });
        }
    }
    await pLimit(projectTasks, CFG.CONCURRENCY);
    console.log(`   ✓ ${projects.length} projects created  (${elapsed(t0)})\n`);

    // ── 3. ADD PROJECT MEMBERS ──────────────────────────────────
    console.log(
        `👥 Adding ${CFG.MEMBERS_PER_PROJECT_MIN}–${CFG.MEMBERS_PER_PROJECT_MAX} members per project…`,
    );
    await pLimit(
        projects.map((proj) => async () => {
            // Always include owner; sample the rest from the pool
            const targetCount = randomInt(
                CFG.MEMBERS_PER_PROJECT_MIN,
                CFG.MEMBERS_PER_PROJECT_MAX,
            );
            const others = sampleN(
                allUserIds.filter((id) => id !== proj.ownerUserId),
                targetCount - 1,
            );
            const memberIds = [proj.ownerUserId, ...others];
            proj.memberIds = memberIds;

            // addProjectMembers accepts up to 1000 per call — chunk if needed
            const CHUNK = 500;
            for (let c = 0; c < memberIds.length; c += CHUNK) {
                await gql(
                    M_ADD_PROJECT_MEMBERS,
                    { pid: proj.id, uids: memberIds.slice(c, c + CHUNK) },
                    proj.ownerToken,
                );
            }
        }),
        CFG.CONCURRENCY,
    );
    console.log(`   ✓ Members added  (${elapsed(t0)})\n`);

    // ── 4. CREATE TEAMS ─────────────────────────────────────────
    console.log(
        `🛡  Creating ${CFG.TEAMS_PER_PROJECT_MIN}–${CFG.TEAMS_PER_PROJECT_MAX} teams per project…`,
    );
    await pLimit(
        projects.map((proj) => async () => {
            const numTeams = randomInt(
                CFG.TEAMS_PER_PROJECT_MIN,
                CFG.TEAMS_PER_PROJECT_MAX,
            );
            const teamTasks = Array.from(
                { length: numTeams },
                (_, ti) => async () => {
                    const d = await gql<{
                        createTeam: { team: { id: string } };
                    }>(
                        M_CREATE_TEAM,
                        { pid: proj.id, name: generateTeamName(ti + 1) },
                        proj.ownerToken,
                    );
                    proj.teamIds.push(d.createTeam.team.id);
                },
            );
            // sequential within a project to avoid race on teamsCount
            for (const t of teamTasks) await t();
        }),
        Math.ceil(CFG.CONCURRENCY / 2),
    );
    console.log(`   ✓ Teams created  (${elapsed(t0)})\n`);

    // ── 5. ADD TEAM MEMBERS ─────────────────────────────────────
    console.log(
        `👤 Adding ${CFG.TEAM_MEMBERS_MIN}–${CFG.TEAM_MEMBERS_MAX} members per team…`,
    );
    const teamMemberTasks: (() => Promise<void>)[] = [];
    for (const proj of projects) {
        for (const teamId of proj.teamIds) {
            teamMemberTasks.push(async () => {
                const count = randomInt(
                    CFG.TEAM_MEMBERS_MIN,
                    CFG.TEAM_MEMBERS_MAX,
                );
                const members = sampleN(proj.memberIds, count);
                proj.teamMemberMap.set(teamId, members);
                if (members.length === 0) return;
                await gql(
                    M_ADD_TEAM_MEMBERS,
                    { pid: proj.id, tid: teamId, uids: members },
                    proj.ownerToken,
                );
            });
        }
    }
    await pLimit(teamMemberTasks, CFG.CONCURRENCY);
    console.log(`   ✓ Team members added  (${elapsed(t0)})\n`);

    // ── 6. CREATE TASKS ─────────────────────────────────────────
    console.log(
        `📋 Creating ${CFG.TASKS_PER_PROJECT_MIN}–${CFG.TASKS_PER_PROJECT_MAX} tasks per project (${projects.length} projects)…`,
    );
    const taskCreateTasks: (() => Promise<void>)[] = [];
    for (const proj of projects) {
        const numTasks = randomInt(
            CFG.TASKS_PER_PROJECT_MIN,
            CFG.TASKS_PER_PROJECT_MAX,
        );
        for (let i = 0; i < numTasks; i++) {
            taskCreateTasks.push(async () => {
                const title = generateTaskTitle();
                const status = pickWeighted(STATUSES, STATUS_WEIGHTS);
                const d = await gql<{
                    task: { create: { id: string; version: number } };
                }>(
                    M_CREATE_TASK,
                    {
                        input: {
                            projectId: proj.id,
                            title,
                            description: generateTaskDesc(title),
                            status,
                        },
                    },
                    proj.ownerToken,
                );
                proj.taskIds.push(d.task.create.id);
            });
        }
    }
    await pLimit(taskCreateTasks, CFG.CONCURRENCY);
    console.log(`   ✓ Tasks created  (${elapsed(t0)})\n`);

    // ── 7. ASSIGN TEAMS & MEMBERS TO TASKS ──────────────────────
    console.log('🔗 Assigning random teams & members to tasks…');
    const assignTasks: (() => Promise<void>)[] = [];
    for (const proj of projects) {
        for (const taskId of proj.taskIds) {
            assignTasks.push(async () => {
                const teamId =
                    proj.teamIds.length > 0 ? pick(proj.teamIds) : undefined;
                const teamMembers = teamId
                    ? (proj.teamMemberMap.get(teamId) ?? [])
                    : proj.memberIds;
                const memberId =
                    teamMembers.length > 0 ? pick(teamMembers) : undefined;

                if (!teamId && !memberId) return;
                try {
                    await gql(
                        M_UPDATE_TASK,
                        {
                            tid: taskId,
                            input: {
                                projectId: proj.id,
                                version: 1,
                                ...(teamId ? { teamId } : {}),
                                ...(memberId ? { memberId } : {}),
                            },
                        },
                        proj.ownerToken,
                    );
                } catch {
                    // version mismatch or constraint — skip silently
                }
            });
        }
    }
    await pLimit(assignTasks, CFG.CONCURRENCY);
    console.log(`   ✓ Assignments done  (${elapsed(t0)})\n`);

    // ── 8. CREATE DEEP DAG LINKS ─────────────────────────────────
    //  For G% of tasks per project, build isolated DAG sub-graphs
    //  with random depth E–F. No cross-sub-graph edges → safe paths.
    console.log(
        `🕸  Building DAG links for ${CFG.LINKED_TASK_PCT}% of tasks (depth ${CFG.LINK_DEPTH_MIN}–${CFG.LINK_DEPTH_MAX})…`,
    );

    let totalLinks = 0;
    const linkTasks: (() => Promise<void>)[] = [];

    for (const proj of projects) {
        if (proj.taskIds.length < 2) continue;

        // Pick G% of tasks to participate in link sub-graphs
        const linkedCount = Math.max(
            2,
            Math.floor((proj.taskIds.length * CFG.LINKED_TASK_PCT) / 100),
        );
        const linkedTasks = sampleN(proj.taskIds, linkedCount);

        // Build DAG: layer-by-layer with random fanout=1-3
        const depth = randomInt(CFG.LINK_DEPTH_MIN, CFG.LINK_DEPTH_MAX);
        const layers: string[][] = [];
        const remaining = [...linkedTasks];

        // Layer 0: roots
        const rootCount = Math.min(randomInt(1, 3), remaining.length);
        layers.push(remaining.splice(0, rootCount));

        while (remaining.length > 0 && layers.length < depth) {
            const parentLayer = layers[layers.length - 1]!;
            const layerNodes: string[] = [];
            for (const parent of parentLayer) {
                if (remaining.length === 0) break;
                const childCount = Math.min(randomInt(1, 3), remaining.length);
                for (let c = 0; c < childCount; c++) {
                    layerNodes.push(remaining.shift()!);
                }
            }
            if (layerNodes.length === 0) break;
            layers.push(layerNodes);
        }

        // Overflow → attach to random already-placed nodes
        const flat = layers.flat();
        for (const orphan of remaining) {
            const parent = flat[randomInt(0, flat.length - 1)]!;
            flat.push(orphan);
            linkTasks.push(async () => {
                try {
                    await gql(
                        M_CREATE_LINK,
                        {
                            input: {
                                projectId: proj.id,
                                sourceTaskId: parent,
                                targetTaskId: orphan,
                                label: pick(LINK_LABELS),
                            },
                        },
                        proj.ownerToken,
                    );
                    totalLinks++;
                } catch {
                    /* duplicate / cycle guard — skip */
                }
            });
        }

        // Emit layer-to-layer links
        const usedEdges = new Set<string>();
        for (let l = 0; l < layers.length - 1; l++) {
            const fromLayer = layers[l]!;
            const toLayer = layers[l + 1]!;
            for (const src of fromLayer) {
                const tgt = pick(toLayer);
                const key = `${src}→${tgt}`;
                if (usedEdges.has(key)) continue;
                usedEdges.add(key);
                linkTasks.push(async () => {
                    try {
                        await gql(
                            M_CREATE_LINK,
                            {
                                input: {
                                    projectId: proj.id,
                                    sourceTaskId: src,
                                    targetTaskId: tgt,
                                    label: pick(LINK_LABELS),
                                },
                            },
                            proj.ownerToken,
                        );
                        totalLinks++;
                    } catch {
                        /* cycle guard — skip */
                    }
                });
            }
        }

        // Extra cross-edges within the sub-graph (15% of linked tasks) → junction nodes
        const extraCount = Math.floor(linkedCount * 0.15);
        for (let e = 0; e < extraCount; e++) {
            const fi = randomInt(0, flat.length - 2);
            const ti = randomInt(fi + 1, flat.length - 1);
            const src = flat[fi]!;
            const tgt = flat[ti]!;
            const key = `${src}→${tgt}`;
            if (usedEdges.has(key)) continue;
            usedEdges.add(key);
            linkTasks.push(async () => {
                try {
                    await gql(
                        M_CREATE_LINK,
                        {
                            input: {
                                projectId: proj.id,
                                sourceTaskId: src,
                                targetTaskId: tgt,
                                label: pick(LINK_LABELS),
                            },
                        },
                        proj.ownerToken,
                    );
                    totalLinks++;
                } catch {
                    /* skip */
                }
            });
        }
    }

    await pLimit(linkTasks, CFG.CONCURRENCY);
    console.log(
        `   ✓ ${totalLinks.toLocaleString()} links created  (${elapsed(t0)})\n`,
    );

    // ── SUMMARY ─────────────────────────────────────────────────
    const totalSecs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n✅ Volume seed complete in ${totalSecs}s`);
    console.log('📊 Summary:');
    console.log(`   Users            : ${allUserIds.length.toLocaleString()}`);
    console.log(`   Projects         : ${projects.length}`);
    console.log(
        `   Members/project  : ${CFG.MEMBERS_PER_PROJECT_MIN}–${CFG.MEMBERS_PER_PROJECT_MAX} (random)`,
    );
    console.log(
        `   Teams/project    : ${CFG.TEAMS_PER_PROJECT_MIN}–${CFG.TEAMS_PER_PROJECT_MAX} (random)`,
    );
    console.log(
        `   Team members     : ${CFG.TEAM_MEMBERS_MIN}–${CFG.TEAM_MEMBERS_MAX} per team`,
    );
    console.log(
        `   Tasks/project    : ${CFG.TASKS_PER_PROJECT_MIN}–${CFG.TASKS_PER_PROJECT_MAX} (random)`,
    );
    console.log(
        `   Total tasks      : ${projects.reduce((s, p) => s + p.taskIds.length, 0).toLocaleString()}`,
    );
    console.log(`   Total links      : ${totalLinks.toLocaleString()}`);
    console.log(
        `   Link depth range : ${CFG.LINK_DEPTH_MIN}–${CFG.LINK_DEPTH_MAX}`,
    );
    console.log(`   Linked task pct  : ${CFG.LINKED_TASK_PCT}%`);
}

seed().catch((err) => {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
});
