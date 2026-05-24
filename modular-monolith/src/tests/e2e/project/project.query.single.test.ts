import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from './mutation.ts';
import { GET_SINGLE_PROJECT } from './query.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Project Single Query E2E', () => {
    let owner: { id: string; username: string; email: string };
    let token1: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        token1 = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );
    });

    it('should fetch a project by ID successfully and verify all fields', async () => {
        // [1] Create Project
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Query Test', description: 'Testing queries' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // [2] Query Project
        const queryRes = await gqlRequest({
            query: GET_SINGLE_PROJECT,
            variables: { id: projectId },
            token: token1,
        });

        expect(queryRes.status).toBe(200);
        const project = queryRes.body.data.project;
        expect(project.id).toBe(projectId);
        expect(project.name).toBe('Query Test');
        expect(project.description).toBe('Testing queries');
        expect(project.version).toBe(1);
        expect(project.projectMembersCount).toBe(0); // Owner is NOT a member in bridge table by default
        expect(project.tasksCount).toBe(0);
        expect(project.teamsCount).toBe(0);
        expect(project.creator.id).toBe(owner.id);
        expect(project.creator.username).toBe(owner.username);
    });

    it('should return null when fetching a non-existent project ID', async () => {
        const randomId = '550e8400-e29b-41d4-a716-446655440000';
        const res = await gqlRequest({
            query: GET_SINGLE_PROJECT,
            variables: { id: randomId },
            token: token1,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.project).toBeNull();
    });

    it('should return null when fetching a project the user is not authorized to view', async () => {
        // [1] Owner creates project
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Private Project' },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        // [2] Stranger tries to fetch it
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

        const queryRes = await gqlRequest({
            query: GET_SINGLE_PROJECT,
            variables: { id: projectId },
            token: strangerToken,
        });

        expect(queryRes.body.data.project).toBeNull();
    });

    it('should handle UTF-8 and special characters in single project query', async () => {
        const complexName = 'Query 🚀 (UTF-8) ⚡️';
        const createRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: complexName },
            token: token1,
        });
        const projectId = createRes.body.data.createProject.id;

        const queryRes = await gqlRequest({
            query: GET_SINGLE_PROJECT,
            variables: { id: projectId },
            token: token1,
        });

        expect(queryRes.body.data.project.name).toBe(complexName);
    });
});
