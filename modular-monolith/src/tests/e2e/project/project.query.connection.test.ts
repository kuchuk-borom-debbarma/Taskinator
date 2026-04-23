import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { ADD_PROJECT_MEMBERS, CREATE_PROJECT } from './mutation.ts';
import { GET_USER_PROJECTS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Connection Query E2E', () => {
    let user1: { id: string; username: string; email: string };
    let token1: string;

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
    });

    it('should fetch user projects with totalCount and verify owned/joined projects', async () => {
        // [1] Create 2 owned projects
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Owned 1' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Owned 2' },
            token: token1,
        });

        // [2] Join 1 project owned by someone else
        const user2 = await db
            .insertInto('users')
            .values({
                email: 'user2@test.com',
                username: 'user2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const token2 = jwt.sign(
            { id: user2.id, email: user2.email, username: user2.username },
            JWT_SECRET,
        );
        const res3 = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Joined 1' },
            token: token2,
        });
        const p3Id = res3.body.data.createProject.id;

        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId: p3Id, userIds: [user1.id] },
            token: token2,
        });

        // [3] Fetch
        const queryRes = await gqlRequest({
            query: GET_USER_PROJECTS,
            variables: { first: 10 },
            token: token1,
        });

        expect(queryRes.body.data.me.projects.totalCount).toBe(3);
        expect(queryRes.body.data.me.projects.edges.length).toBe(3);
        const names = queryRes.body.data.me.projects.edges.map(
            (e: any) => e.node.name,
        );
        expect(names).toContain('Owned 1');
        expect(names).toContain('Owned 2');
        expect(names).toContain('Joined 1');
    });

    it('should support forward pagination (first/after)', async () => {
        // Create 3 projects: Project 1, Project 2, Project 3
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 1' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 2' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 3' },
            token: token1,
        });

        // Fetch first 2
        const res1 = await gqlRequest({
            query: GET_USER_PROJECTS,
            variables: { first: 2 },
            token: token1,
        });

        expect(res1.body.data.me.projects.edges.length).toBe(2);
        expect(res1.body.data.me.projects.pageInfo.hasNextPage).toBe(true);
        const endCursor = res1.body.data.me.projects.pageInfo.endCursor;

        // Fetch next 1 after cursor
        const res2 = await gqlRequest({
            query: GET_USER_PROJECTS,
            variables: { first: 2, after: endCursor },
            token: token1,
        });

        expect(res2.body.data.me.projects.edges.length).toBe(1);
        expect(res2.body.data.me.projects.pageInfo.hasNextPage).toBe(false);
    });

    it('should support backward pagination (last/before)', async () => {
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 1' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 2' },
            token: token1,
        });
        await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 3' },
            token: token1,
        });

        // Fetch last 2
        const res1 = await gqlRequest({
            query: GET_USER_PROJECTS,
            variables: { last: 2 },
            token: token1,
        });

        expect(res1.body.data.me.projects.edges.length).toBe(2);
        expect(res1.body.data.me.projects.pageInfo.hasPreviousPage).toBe(true);
        const startCursor = res1.body.data.me.projects.pageInfo.startCursor;

        // Fetch 1 before start cursor
        const res2 = await gqlRequest({
            query: GET_USER_PROJECTS,
            variables: { last: 2, before: startCursor },
            token: token1,
        });

        expect(res2.body.data.me.projects.edges.length).toBe(1);
        expect(res2.body.data.me.projects.pageInfo.hasPreviousPage).toBe(false);
    });
});
