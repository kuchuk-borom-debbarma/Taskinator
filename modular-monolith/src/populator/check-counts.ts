const GRAPHQL_URL = 'http://localhost:3000/graphql';

async function gql(query, variables = {}, token) {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
    });
    return await res.json();
}

async function check() {
    // 1. Sign in
    const auth = await gql(
        `
        mutation SignIn($email: String!, $password_raw: String!) {
            signIn(email: $email, password_raw: $password_raw) {
                token
            }
        }
    `,
        { email: 'user1@taskinator.com', password_raw: 'password123' },
    );

    const token = auth.data.signIn.token;

    // 2. Get Projects and their counts
    const data = await gql(
        `
        query GetProjects {
            me {
                projects(first: 10) {
                    edges {
                        node {
                            id
                            name
                            projectMembersCount
                            tasksCount
                            teamsCount
                        }
                    }
                }
            }
        }
    `,
        {},
        token,
    );

    console.log(JSON.stringify(data, null, 2));
}

check();
