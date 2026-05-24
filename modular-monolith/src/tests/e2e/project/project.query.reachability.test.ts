import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { ADD_PROJECT_MEMBERS, CREATE_PROJECT } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const GET_MEMBER_PROJECT = `
    query GetMemberProject($id: ID!) {
        project(id: $id) {
            projectMembers(first: 1) {
                edges {
                    node {
                        id
                        project {
                            id
                            name
                        }
                    }
                }
            }
        }
    }
`;

describe('Project Reachability Query E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;
    let projectId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        user1 = await db
            .insertInto('users')
            .values({
                email: 'user1@test.com',
                username: 'user1',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: user1.id, email: user1.email, username: user1.username },
            JWT_SECRET,
        );

        const res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Reachability Project' },
            token: token1,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should allow traversing from ProjectMember back to Project', async () => {
        // [1] Add User 1 as member (though he is owner, let's add him to the bridge for test)
        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [user1.id] },
            token: token1,
        });

        // [2] Query Project -> Member -> Project
        const res = await gqlRequest({
            query: GET_MEMBER_PROJECT,
            variables: { id: projectId },
            token: token1,
        });

        const memberNode = res.body.data.project.projectMembers.edges[0].node;
        expect(memberNode.project.id).toBe(projectId);
        expect(memberNode.project.name).toBe('Reachability Project');
    });

    it('should respect authorization when traversing from Member to Project', async () => {
        // [1] Setup: User 2 is a member of Project A
        const user2 = await db
            .insertInto('users')
            .values({
                email: 'user2@test.com',
                username: 'user2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: user2.id })
            .execute();

        // [2] Stranger (User 3) somehow gets a Member ID (e.g. through a public profile or leak)
        const user3 = await db
            .insertInto('users')
            .values({
                email: 'user3@test.com',
                username: 'user3',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const token3 = jwt.sign(
            { id: user3.id, email: user3.email, username: user3.username },
            JWT_SECRET,
        );

        // [3] Stranger tries to fetch project through the member traversal
        // Note: project(id: $id) will return null first if not authorized
        const res = await gqlRequest({
            query: GET_MEMBER_PROJECT,
            variables: { id: projectId },
            token: token3,
        });

        expect(res.body.data.project).toBeNull();
    });
});
