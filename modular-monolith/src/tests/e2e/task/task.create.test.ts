import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Creation E2E', () => {
    let owner: { id: string; username: string; email: string };
    let member: { id: string; username: string; email: string };
    let stranger: { id: string; username: string; email: string };
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;

    beforeAll(async () => {
        await bootstrapE2E();
    });

    afterAll(async () => {
        await teardownE2E();
    });

    beforeEach(async () => {
        await cleanupDb();

        // [1] Setup Users
        owner = await db
            .insertInto('users')
            .values({
                email: 'owner@test.com',
                username: 'owner',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        member = await db
            .insertInto('users')
            .values({
                email: 'member@test.com',
                username: 'member',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();
        stranger = await db
            .insertInto('users')
            .values({
                email: 'stranger@test.com',
                username: 'stranger',
                password_hash: 'a',
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );
        memberToken = jwt.sign(
            { id: member.id, email: member.email, username: member.username },
            JWT_SECRET,
        );
        strangerToken = jwt.sign(
            {
                id: stranger.id,
                email: stranger.email,
                username: stranger.username,
            },
            JWT_SECRET,
        );

        // [2] Create Project
        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Engineering Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // [3] Add 'member' to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();
    });

    it('should allow the project owner to create a task', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'Fix critical bug',
                    description: 'The auth flow is broken in safari',
                    status: 'IN_PROGRESS',
                },
            },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        const task = res.body.data.task.create;
        expect(task.title).toBe('Fix critical bug');
        expect(task.description).toBe('The auth flow is broken in safari');
        expect(task.status).toBe('IN_PROGRESS');
        expect(task.project.id).toBe(projectId);
        expect(task.version).toBe(1);
        expect(task.createdBy.id).toBe(owner.id);

        // Verify in DB
        const taskDb = await db
            .selectFrom('project_task')
            .where('id', '=', task.id)
            .selectAll()
            .executeTakeFirst();
        expect(taskDb).toBeDefined();
        expect(taskDb?.title).toBe('Fix critical bug');
        expect(taskDb?.description).toBe('The auth flow is broken in safari');
        expect(taskDb?.status).toBe('IN_PROGRESS');
        expect(taskDb?.created_by).toBe(owner.id);
        expect(taskDb?.fk_project_id).toBe(projectId);
    });

    it('should default status to TODO if omitted', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'New Feature Request',
                },
            },
            token: ownerToken,
        });

        expect(res.body.data.task.create.status).toBe('TODO');
        const taskDb = await db
            .selectFrom('project_task')
            .select(['status'])
            .where('id', '=', res.body.data.task.create.id)
            .executeTakeFirstOrThrow();
        expect(taskDb.status).toBe('TODO');
    });

    it('should allow a project member to create a task', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'Member Task',
                },
            },
            token: memberToken,
        });

        expect(res.body.data.task.create.title).toBe('Member Task');
        expect(res.body.data.task.create.createdBy.id).toBe(member.id);
        const taskDb = await db
            .selectFrom('project_task')
            .select(['created_by', 'fk_project_id'])
            .where('id', '=', res.body.data.task.create.id)
            .executeTakeFirstOrThrow();
        expect(taskDb.created_by).toBe(member.id);
        expect(taskDb.fk_project_id).toBe(projectId);
    });

    it('should fail when a stranger tries to create a task', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'Illegal Task',
                },
            },
            token: strangerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'not found or you do not have permission',
        );

        const tasks = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(tasks).toHaveLength(0);
    });

    it('should fail when unauthenticated', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'Ghost Task',
                },
            },
        });

        expect(res.status).toBe(401);
        const tasks = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(tasks).toHaveLength(0);
    });

    it('should fail if title is too short', async () => {
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId,
                    title: 'A',
                },
            },
            token: ownerToken,
        });

        // Backend validation should trigger
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('between 3 and 255');

        const tasks = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(tasks).toHaveLength(0);
    });

    it('should fail if project does not exist', async () => {
        const fakeProjectId = '00000000-0000-0000-0000-000000000000';
        const beforeCount = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();
        const res = await gqlRequest({
            query: CREATE_TASK,
            variables: {
                input: {
                    projectId: fakeProjectId,
                    title: 'Void Task',
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('not found');

        const tasks = await db
            .selectFrom('project_task')
            .select('id')
            .where('fk_project_id', '=', projectId)
            .execute();
        expect(tasks).toHaveLength(beforeCount.length);
    });

    it('should eventually update project tasks_count (Event-Driven)', async () => {
        // [1] Create 2 tasks
        await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task 1' } },
            token: ownerToken,
        });
        await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task 2' } },
            token: ownerToken,
        });

        // [2] Poll for counter update
        let tasksCount = 0;
        for (let i = 0; i < 20; i++) {
            const project = await db
                .selectFrom('project')
                .where('id', '=', projectId)
                .select(['tasks_count'])
                .executeTakeFirst();

            tasksCount = project?.tasks_count || 0;
            if (tasksCount === 2) break;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        expect(tasksCount).toBe(2);
    });
});
