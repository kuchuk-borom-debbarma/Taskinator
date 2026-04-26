import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { ADD_PROJECT_MEMBERS, CREATE_PROJECT } from './mutation.ts';
import { GET_PROJECT_MEMBERS } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Member Connection Query E2E', () => {
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
            variables: { name: 'Member Query Project' },
            token: token1,
        });
        projectId = res.body.data.createProject.id;
    });

    it('should fetch project members with pagination', async () => {
        // [1] Add 3 members
        const u2 = await db
            .insertInto('users')
            .values({
                email: 'u2@test.com',
                username: 'u2',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const u3 = await db
            .insertInto('users')
            .values({
                email: 'u3@test.com',
                username: 'u3',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const u4 = await db
            .insertInto('users')
            .values({
                email: 'u4@test.com',
                username: 'u4',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        await gqlRequest({
            query: ADD_PROJECT_MEMBERS,
            variables: { projectId, userIds: [u2.id, u3.id, u4.id] },
            token: token1,
        });

        // [2] Fetch first 2
        const res1 = await gqlRequest({
            query: GET_PROJECT_MEMBERS,
            variables: { id: projectId, first: 2 },
            token: token1,
        });

        expect(res1.body.data.project.projectMembers.edges.length).toBe(2);
        expect(res1.body.data.project.projectMembers.pageInfo.hasNextPage).toBe(
            true,
        );

        const endCursor =
            res1.body.data.project.projectMembers.pageInfo.endCursor;

        // [3] Fetch next
        const res2 = await gqlRequest({
            query: GET_PROJECT_MEMBERS,
            variables: { id: projectId, first: 2, after: endCursor },
            token: token1,
        });

        expect(res2.body.data.project.projectMembers.edges.length).toBe(1);
        expect(res2.body.data.project.projectMembers.pageInfo.hasNextPage).toBe(
            false,
        );
    });

    it('should fail to fetch members of a project the user is not a member of', async () => {
        const stranger = await db
            .insertInto('users')
            .values({
                email: 'stranger@test.com',
                username: 'stranger',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        const strangerToken = jwt.sign(
            {
                id: stranger.id,
                email: stranger.email,
                username: stranger.username,
            },
            JWT_SECRET,
        );

        const res = await gqlRequest({
            query: GET_PROJECT_MEMBERS,
            variables: { id: projectId, first: 10 },
            token: strangerToken,
        });

        // Authorization should return null for the 'project' field
        expect(res.body.data.project).toBeNull();
    });
});
