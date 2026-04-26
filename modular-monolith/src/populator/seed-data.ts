export {};

const GRAPHQL_URL = 'http://localhost:3000/graphql';
const rng = createSeededRandom(20260426);

const CONFIG = {
    userCount: 60,
    teamCount: 40,
    taskCount: 240,
    maxProjectMemberBatch: 20,
    teamMinMembers: 4,
    teamMaxMembers: 8,
};

type PopulatedUser = {
    email: string;
    username: string;
    password: string;
};

type PopulatedTeam = {
    id: string;
    name: string;
    members: string[];
};

type PopulatedTask = {
    id: string;
    title: string;
    version?: number;
    teamId: string;
    memberId: string;
    teamIndex: number;
    status: string;
};

type LinkInput = {
    sourceTaskId: string;
    targetTaskId: string;
    label: string;
};

async function gql(query: string, variables: any = {}, token?: string) {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    const result = await res.json();
    if (result.errors) {
        console.error(
            'GraphQL Errors:',
            JSON.stringify(result.errors, null, 2),
        );
        throw new Error('GraphQL Operation Failed');
    }
    return result.data;
}

const MUTATIONS = {
    SIGN_UP: `
        mutation SignUp($email: String!, $username: String!, $password: String!) {
            signUp(email: $email, username: $username, password_raw: $password)
        }
    `,
    SIGN_IN: `
        mutation SignIn($email: String!, $password_raw: String!) {
            signIn(email: $email, password_raw: $password_raw) {
                token
            }
        }
    `,
    CREATE_PROJECT: `
        mutation CreateProject($name: String!, $description: String) {
            createProject(name: $name, description: $description) {
                id
                name
            }
        }
    `,
    ADD_PROJECT_MEMBERS: `
        mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {
            addProjectMembers(projectId: $projectId, userIds: $userIds) {
                success
            }
        }
    `,
    CREATE_TEAM: `
        mutation CreateTeam($projectId: ID!, $name: String!) {
            createTeam(projectId: $projectId, name: $name) {
                team {
                    id
                    name
                }
            }
        }
    `,
    ADD_TEAM_MEMBERS: `
        mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {
            addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {
                success
            }
        }
    `,
    CREATE_TASK: `
        mutation CreateTask($input: CreateTaskInput!) {
            task {
                create(input: $input) {
                    id
                    title
                    version
                }
            }
        }
    `,
    UPDATE_TASK: `
        mutation UpdateTask($taskId: ID!, $input: UpdateTaskInput!) {
            task {
                update(taskId: $taskId, input: $input) {
                    id
                    title
                    version
                }
            }
        }
    `,
    CREATE_TASK_LINK: `
        mutation CreateTaskLink($input: CreateTaskLinkInput!) {
            task {
                createLink(input: $input) {
                    id
                    label
                }
            }
        }
    `,
    ME: `
        query Me {
            me {
                id
                username
            }
        }
    `,
};

async function run() {
    console.log('🚀 Starting Robust Populator...');

    // 1. Create users
    const users: PopulatedUser[] = [];
    console.log(`👤 Registering ${CONFIG.userCount} users...`);
    for (let i = 1; i <= CONFIG.userCount; i++) {
        const u = {
            email: `user${i}@taskinator.com`,
            username: `user_${i}`,
            password: 'password123',
        };
        try {
            await gql(MUTATIONS.SIGN_UP, u);
        } catch {}
        users.push(u);
    }

    // Login as Admin (user1)
    const adminData = await gql(MUTATIONS.SIGN_IN, {
        email: users[0]!.email,
        password_raw: users[0]!.password,
    });
    const adminToken = adminData.signIn.token;

    // Get all user IDs
    const userIds: string[] = [];
    for (const u of users) {
        const d = await gql(MUTATIONS.SIGN_IN, {
            email: u.email,
            password_raw: u.password,
        });
        const t = d.signIn.token;
        const me = await gql(MUTATIONS.ME, {}, t);
        userIds.push(me.me.id);
    }
    // 2. Create Project
    console.log('🏗 Creating Mega Project...');
    const projectData = await gql(
        MUTATIONS.CREATE_PROJECT,
        {
            name: 'The Great Antigravity Engine',
            description:
                'A massive scale orchestration project for agentic AI.',
        },
        adminToken,
    );
    const projectId = projectData.createProject.id;

    // 3. Add all users to project
    console.log(
        `👥 Adding all ${CONFIG.userCount} users to project members...`,
    );
    for (let i = 0; i < userIds.length; i += CONFIG.maxProjectMemberBatch) {
        await gql(
            MUTATIONS.ADD_PROJECT_MEMBERS,
            {
                projectId,
                userIds: userIds.slice(i, i + CONFIG.maxProjectMemberBatch),
            },
            adminToken,
        );
    }

    // 4. Create teams
    console.log(`🏢 Creating ${CONFIG.teamCount} teams...`);
    const teams: PopulatedTeam[] = [];
    for (let i = 1; i <= CONFIG.teamCount; i++) {
        const teamData = await gql(
            MUTATIONS.CREATE_TEAM,
            {
                projectId,
                name: `Squad ${i.toString().padStart(3, '0')}`,
            },
            adminToken,
        );
        const teamName = teamData.createTeam.team.name as string;
        const teamId = teamData.createTeam.team.id as string;

        const numMembers = randomInt(
            CONFIG.teamMinMembers,
            CONFIG.teamMaxMembers,
        );
        const shuffled = shuffle([...userIds]);
        const selectedMembers = shuffled.slice(0, numMembers);

        await gql(
            MUTATIONS.ADD_TEAM_MEMBERS,
            {
                projectId,
                teamId,
                userIds: selectedMembers,
            },
            adminToken,
        );

        teams.push({ id: teamId, name: teamName, members: selectedMembers });
        if (i % 20 === 0) console.log(`   ... created ${i} teams`);
    }

    // 5. Create tasks
    console.log(`📝 Creating ${CONFIG.taskCount} tasks...`);
    const tasks: PopulatedTask[] = [];
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE', 'TODO', 'IN_PROGRESS'];
    for (let i = 1; i <= CONFIG.taskCount; i++) {
        const status = pick(statuses);
        const taskData = await gql(
            MUTATIONS.CREATE_TASK,
            {
                input: {
                    projectId,
                    title: `Task #${i}: ${getRandomObjective()}`,
                    description: `This task covers the ${i}-th iteration of the ${getRandomComponent()} subsystem.`,
                    status,
                },
            },
            adminToken,
        );

        const task = taskData.task.create;

        const teamIndex = (i - 1) % teams.length;
        const randomTeam = getOrThrow(teams, teamIndex, 'team');
        const randomMember = getOrThrow(
            randomTeam.members,
            randomInt(0, randomTeam.members.length - 1),
            'team member',
        );

        await gql(
            MUTATIONS.UPDATE_TASK,
            {
                taskId: task.id,
                input: {
                    projectId,
                    version: task.version,
                    teamId: randomTeam.id,
                    memberId: randomMember,
                },
            },
            adminToken,
        );

        tasks.push({
            id: task.id,
            title: task.title,
            teamId: randomTeam.id,
            memberId: randomMember,
            teamIndex,
            status,
        });
        if (i % 20 === 0) console.log(`   ... created ${i} tasks`);
    }

    // 6. Create structured dense graph
    console.log('🔗 Creating Complex Task Links...');
    const linkInputs = buildComplexLinks(tasks, teams.length);
    let linkCount = 0;
    let duplicateOrRejectedCount = 0;
    for (let i = 0; i < linkInputs.length; i++) {
        try {
            await gql(
                MUTATIONS.CREATE_TASK_LINK,
                {
                    input: { projectId, ...linkInputs[i] },
                },
                adminToken,
            );
            linkCount++;
        } catch {
            duplicateOrRejectedCount++;
        }
        if ((i + 1) % 100 === 0) {
            console.log(`   ... attempted ${i + 1} links`);
        }
    }

    console.log(`\n✨ Robust Populator finished!`);
    console.log(`
    Summary:
    - Project: The Great Antigravity Engine
    - Users: ${CONFIG.userCount}
    - Teams: ${CONFIG.teamCount}
    - Tasks: ${CONFIG.taskCount}
    - Links: ${linkCount} dependencies created
    - Rejected/Duplicate Links: ${duplicateOrRejectedCount}
    `);
}

function buildComplexLinks(
    tasks: PopulatedTask[],
    teamCount: number,
): LinkInput[] {
    const links: LinkInput[] = [];
    const linkSet = new Set<string>();
    const tasksByTeam = Array.from(
        { length: teamCount },
        () => [] as PopulatedTask[],
    );

    for (const task of tasks) {
        getOrThrow(tasksByTeam, task.teamIndex, 'tasksByTeam').push(task);
    }

    const addLink = (
        sourceTaskId: string,
        targetTaskId: string,
        label: string,
    ) => {
        if (sourceTaskId === targetTaskId) return;
        const key = `${sourceTaskId}->${targetTaskId}`;
        if (linkSet.has(key)) return;
        linkSet.add(key);
        links.push({ sourceTaskId, targetTaskId, label });
    };

    for (const teamTasks of tasksByTeam) {
        teamTasks.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Intra-team chains, skips, local fan-out.
    for (const teamTasks of tasksByTeam) {
        for (let i = 0; i < teamTasks.length - 1; i++) {
            addLink(teamTasks[i]!.id, teamTasks[i + 1]!.id, 'BLOCKS');
        }
        for (let i = 0; i < teamTasks.length - 2; i++) {
            addLink(teamTasks[i]!.id, teamTasks[i + 2]!.id, 'REQUIRES');
        }
        if (teamTasks.length >= 6) {
            const hub = teamTasks[1]!;
            for (let i = 3; i < Math.min(teamTasks.length, 8); i++) {
                addLink(hub.id, teamTasks[i]!.id, 'RELATES_TO');
            }
        }
    }

    // Cross-team bridges to form layered DAG between adjacent teams.
    for (let teamIndex = 0; teamIndex < tasksByTeam.length - 1; teamIndex++) {
        const current = getOrThrow(
            tasksByTeam,
            teamIndex,
            'current team tasks',
        );
        const next = getOrThrow(tasksByTeam, teamIndex + 1, 'next team tasks');
        const bridgeCount = Math.min(4, current.length, next.length);
        for (let i = 0; i < bridgeCount; i++) {
            addLink(
                current[current.length - 1 - i]!.id,
                next[i]!.id,
                'UNBLOCKS',
            );
        }
    }

    // Larger step bridges to increase depth spread and frontier width.
    for (let teamIndex = 0; teamIndex < tasksByTeam.length - 3; teamIndex++) {
        const sourceGroup = getOrThrow(
            tasksByTeam,
            teamIndex,
            'source team tasks',
        );
        const targetGroup = getOrThrow(
            tasksByTeam,
            teamIndex + 3,
            'target team tasks',
        );
        if (sourceGroup.length === 0 || targetGroup.length === 0) continue;
        addLink(
            sourceGroup[Math.floor(sourceGroup.length / 2)]!.id,
            targetGroup[0]!.id,
            'CROSSES',
        );
        addLink(
            sourceGroup[0]!.id,
            targetGroup[Math.floor(targetGroup.length / 2)]!.id,
            'FEEDS',
        );
    }

    // Global backbone chain for long transitive paths.
    const sortedTasks = [...tasks];
    for (let i = 0; i < sortedTasks.length - 1; i++) {
        addLink(sortedTasks[i]!.id, sortedTasks[i + 1]!.id, 'BLOCKS');
    }

    // Long skip edges for denser reachability closure.
    for (let i = 0; i < sortedTasks.length - 5; i += 2) {
        addLink(sortedTasks[i]!.id, sortedTasks[i + 5]!.id, 'DEPENDS_ON');
    }
    for (let i = 0; i < sortedTasks.length - 11; i += 3) {
        addLink(sortedTasks[i]!.id, sortedTasks[i + 11]!.id, 'AMPLIFIES');
    }

    // Fan-in / fan-out around quarterly milestones.
    const anchors = [20, 60, 100, 140, 180, 220]
        .map((index) => sortedTasks[index])
        .filter((task): task is PopulatedTask => Boolean(task));

    for (const anchor of anchors) {
        const anchorIndex = sortedTasks.findIndex(
            (task) => task.id === anchor.id,
        );
        const sources = sortedTasks.slice(
            Math.max(0, anchorIndex - 6),
            anchorIndex,
        );
        const targets = sortedTasks.slice(anchorIndex + 1, anchorIndex + 7);

        for (const source of sources) {
            addLink(source.id, anchor.id, 'REQUIRES');
        }
        for (const target of targets) {
            addLink(anchor.id, target.id, 'UNBLOCKS');
        }
    }

    // Deterministic pseudo-random sparse noise, still acyclic by index ordering.
    const noiseAttempts = Math.floor(tasks.length * 3.5);
    for (let i = 0; i < noiseAttempts; i++) {
        const sourceIndex = randomInt(0, tasks.length - 2);
        const jump = randomInt(2, Math.min(18, tasks.length - sourceIndex - 1));
        const targetIndex = sourceIndex + jump;
        addLink(
            sortedTasks[sourceIndex]!.id,
            sortedTasks[targetIndex]!.id,
            pick(['RELATES_TO', 'REQUIRES', 'CROSSES', 'INFORMS']),
        );
    }

    return links;
}

function getRandomObjective() {
    const verbs = [
        'Refactor',
        'Optimize',
        'Implement',
        'Debug',
        'Document',
        'Scale',
        'Secure',
        'Integrate',
    ];
    const nouns = [
        'Kafka Stream',
        'Postgres Query',
        'GraphQL Resolver',
        'Team Hierarchy',
        'Auth Middleware',
        'Elasticsearch Index',
        'UI Component',
        'Redis Bridge',
    ];
    return `${pick(verbs)} ${pick(nouns)}`;
}

function getRandomComponent() {
    const components = [
        'Reachability',
        'Telemetry',
        'Ingress',
        'Orchestration',
        'Aggregation',
        'Security',
        'Persistence',
        'Streaming',
    ];
    return components[randomInt(0, components.length - 1)];
}

function createSeededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randomInt(min: number, max: number) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
    return getOrThrow(items, randomInt(0, items.length - 1), 'pick item');
}

function shuffle<T>(items: T[]): T[] {
    const cloned = [...items];
    for (let i = cloned.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        const current = cloned[i]!;
        const swap = cloned[j]!;
        [cloned[i], cloned[j]] = [swap, current];
    }
    return cloned;
}

function getOrThrow<T>(items: T[], index: number, label: string): T {
    const item = items[index];
    if (item === undefined) {
        throw new Error(`Missing ${label} at index ${index}`);
    }
    return item;
}

run().catch((err) => {
    console.error('❌ Populator Failed:', err);
    process.exit(1);
});
