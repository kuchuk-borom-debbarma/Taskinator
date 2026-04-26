export {};

const GRAPHQL_URL = 'http://localhost:3000/graphql';

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

    // 1. Create 50 Users
    const users: any[] = [];
    console.log('👤 Registering 50 users...');
    for (let i = 1; i <= 50; i++) {
        const u = {
            email: `user${i}@taskinator.com`,
            username: `user_${i}`,
            password: 'password123',
        };
        try {
            await gql(MUTATIONS.SIGN_UP, u);
            // console.log(`✅ Registered ${u.username}`);
        } catch (e) {}
        users.push(u);
    }

    // Login as Admin (user1)
    const adminData = await gql(MUTATIONS.SIGN_IN, {
        email: users[0].email,
        password_raw: users[0].password,
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
    const adminId = userIds[0];

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

    // 3. Add all users to project (including admin/owner)
    console.log('👥 Adding all 50 users to project members...');
    // Batch add in chunks of 20
    for (let i = 0; i < userIds.length; i += 20) {
        await gql(
            MUTATIONS.ADD_PROJECT_MEMBERS,
            {
                projectId,
                userIds: userIds.slice(i, i + 20),
            },
            adminToken,
        );
    }

    // 4. Create 100 Teams
    console.log('🏢 Creating 100 Teams...');
    const teams: any[] = [];
    for (let i = 1; i <= 100; i++) {
        const teamData = await gql(
            MUTATIONS.CREATE_TEAM,
            {
                projectId,
                name: `Squad ${i.toString().padStart(3, '0')}`,
            },
            adminToken,
        );
        const teamId = teamData.createTeam.team.id;

        // Add 2-5 random members
        const numMembers = Math.floor(Math.random() * 4) + 2;
        const shuffled = [...userIds].sort(() => 0.5 - Math.random());
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

        teams.push({ id: teamId, members: selectedMembers });
        if (i % 20 === 0) console.log(`   ... created ${i} teams`);
    }

    // 5. Create 100 Tasks
    console.log('📝 Creating 100 Tasks...');
    const tasks: any[] = [];
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE', 'TODO', 'IN_PROGRESS']; // Weighted towards unfinished
    for (let i = 1; i <= 100; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
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

        // Randomly assign to a team and one of its members
        const randomTeam = teams[Math.floor(Math.random() * teams.length)];
        const randomMember =
            randomTeam.members[
                Math.floor(Math.random() * randomTeam.members.length)
            ];

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

        tasks.push({ id: task.id, title: task.title });
        if (i % 20 === 0) console.log(`   ... created ${i} tasks`);
    }

    // 6. Create Random Links (Dependencies)
    console.log('🔗 Creating Complex Task Links...');
    const linkLabels = ['BLOCKS', 'REQUIRES', 'RELATES_TO', 'BLOCKS'];
    let linkCount = 0;
    for (let i = 0; i < 150; i++) {
        // Pick two random tasks, ensure source < target index to avoid simple cycles
        const idx1 = Math.floor(Math.random() * (tasks.length - 1));
        const idx2 =
            idx1 + 1 + Math.floor(Math.random() * (tasks.length - idx1 - 1));

        try {
            await gql(
                MUTATIONS.CREATE_TASK_LINK,
                {
                    input: {
                        projectId,
                        sourceTaskId: tasks[idx1].id,
                        targetTaskId: tasks[idx2].id,
                        label: linkLabels[
                            Math.floor(Math.random() * linkLabels.length)
                        ],
                    },
                },
                adminToken,
            );
            linkCount++;
        } catch (e) {
            // Might fail if link already exists
        }
        if (i % 50 === 0) console.log(`   ... attempted ${i} links`);
    }

    console.log(`\n✨ Robust Populator finished!`);
    console.log(`
    Summary:
    - Project: The Great Antigravity Engine
    - Users: 50
    - Teams: 100
    - Tasks: 100
    - Links: ${linkCount} dependencies created
    `);
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
    return `${verbs[Math.floor(Math.random() * verbs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
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
    return components[Math.floor(Math.random() * components.length)];
}

run().catch((err) => {
    console.error('❌ Populator Failed:', err);
    process.exit(1);
});
