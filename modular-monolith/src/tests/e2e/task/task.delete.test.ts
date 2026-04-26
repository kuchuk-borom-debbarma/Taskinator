import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM } from '../team/mutation.ts';
import { CREATE_TASK, DELETE_TASK, UPDATE_TASK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Delete E2E', () => {
    let owner: any;
    let member: any;
    let stranger: any;
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let taskId: string;

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

        // [4] Create Task
        const taskRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task to Delete' } },
            token: ownerToken,
        });
        taskId = taskRes.body.data.task.create.id;
    });

    it('should allow the project owner to delete a task and update counts/cleanup', async () => {
        // [1] Setup: Add a team and assign it to the task to test team counts
        const tRes = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Team A' },
            token: ownerToken,
        });
        const teamId = tRes.body.data.createTeam.team.id;

        await gqlRequest({
            query: UPDATE_TASK,
            variables: { taskId, input: { projectId, teamId, version: 1 } },
            token: ownerToken,
        });

        // [2] Setup: Add another task and a link to test link cleanup
        const task2Res = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Task 2' } },
            token: ownerToken,
        });
        const taskId2 = task2Res.body.data.task.create.id;

        await gqlRequest({
            query: `mutation CreateLink($input: CreateTaskLinkInput!) { task { createLink(input: $input) { id } } }`,
            variables: {
                input: {
                    projectId,
                    sourceTaskId: taskId,
                    targetTaskId: taskId2,
                    label: 'blocks',
                },
            },
            token: ownerToken,
        });

        // [3] Delete the task
        const res = await gqlRequest({
            query: DELETE_TASK,
            variables: { projectId, taskId },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.task.delete).toBe(taskId);

        // [4] Verify Task is gone
        const dbTask = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .executeTakeFirst();
        expect(dbTask).toBeUndefined();

        // [5] Poll for Project Counter (Eventually Consistent)
        let project: any;
        for (let i = 0; i < 20; i++) {
            project = await db
                .selectFrom('project')
                .where('id', '=', projectId)
                .select('tasks_count')
                .executeTakeFirst();
            if (project?.tasks_count === 1) break; // Task 2 remains
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(project?.tasks_count).toBe(1);

        // [6] Poll for Team Counter
        let team: any;
        for (let i = 0; i < 20; i++) {
            team = await db
                .selectFrom('project_team')
                .where('id', '=', teamId)
                .select('tasks_count')
                .executeTakeFirst();
            if (team?.tasks_count === 0) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(team?.tasks_count).toBe(0);

        // [7] Verify Link Cleanup (Eventually Consistent)
        let dbLink: any;
        for (let i = 0; i < 20; i++) {
            dbLink = await db
                .selectFrom('task_link')
                .where((eb) =>
                    eb('source_task_id', '=', taskId).or(
                        'target_task_id',
                        '=',
                        taskId,
                    ),
                )
                .executeTakeFirst();
            if (!dbLink) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(dbLink).toBeUndefined();

        // [8] Verify Reachability Cleanup (Eventually Consistent)
        let dbReach: any;
        for (let i = 0; i < 20; i++) {
            dbReach = await db
                .selectFrom('task_reachability')
                .where((eb) =>
                    eb('ancestor_task_id', '=', taskId).or(
                        'descendant_task_id',
                        '=',
                        taskId,
                    ),
                )
                .executeTakeFirst();
            if (!dbReach) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(dbReach).toBeUndefined();
    });

    it('should allow a project member to delete a task', async () => {
        const res = await gqlRequest({
            query: DELETE_TASK,
            variables: { projectId, taskId },
            token: memberToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.task.delete).toBe(taskId);

        const dbTask = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .executeTakeFirst();
        expect(dbTask).toBeUndefined();
    });

    it('should fail when a stranger tries to delete a task', async () => {
        const res = await gqlRequest({
            query: DELETE_TASK,
            variables: { projectId, taskId },
            token: strangerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'not found or unauthorized',
        );

        // Verify still in DB
        const dbTask = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .executeTakeFirst();
        expect(dbTask).toBeDefined();
    });

    it('should fail if task does not exist', async () => {
        const fakeTaskId = '00000000-0000-0000-0000-000000000000';
        const res = await gqlRequest({
            query: DELETE_TASK,
            variables: { projectId, taskId: fakeTaskId },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'not found or unauthorized',
        );
    });

    it('should fail if project ID does not match the task', async () => {
        // Create another project
        const p2Res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Other Project' },
            token: ownerToken,
        });
        const p2Id = p2Res.body.data.createProject.id;

        const res = await gqlRequest({
            query: DELETE_TASK,
            variables: { projectId: p2Id, taskId },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'not found or unauthorized',
        );

        // Verify still in DB
        const dbTask = await db
            .selectFrom('project_task')
            .selectAll()
            .where('id', '=', taskId)
            .executeTakeFirst();
        expect(dbTask).toBeDefined();
    });
});
