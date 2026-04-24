import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TEAM } from '../team/mutation.ts';
import { CREATE_TASK, UPDATE_TASK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

describe('Task Update E2E', () => {
    let owner: any;
    let member: any;
    let stranger: any;
    let ownerToken: string;
    let memberToken: string;
    let strangerToken: string;
    let projectId: string;
    let taskId: string;
    let teamId: string;

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

        // [4] Create Team
        const tRes = await gqlRequest({
            query: CREATE_TEAM,
            variables: { projectId, name: 'Backend Team' },
            token: ownerToken,
        });
        teamId = tRes.body.data.createTeam.team.id;

        // [5] Create Task
        const taskRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Initial Task' } },
            token: ownerToken,
        });
        taskId = taskRes.body.data.task.create.id;
    });

    it('should allow the owner to update title and description', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    title: 'Updated Title',
                    description: 'New Description',
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        const task = res.body.data.task.update;
        expect(task.title).toBe('Updated Title');
        expect(task.description).toBe('New Description');
        expect(task.version).toBe(2);

        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'description', 'version', 'updated_by'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Updated Title');
        expect(taskDb.description).toBe('New Description');
        expect(taskDb.version).toBe(2);
        expect(taskDb.updated_by).toBe(owner.id);
    });

    it('should allow assigning a team to a task', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    teamId,
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.data.task.update.team.id).toBe(teamId);
        const taskDb = await db
            .selectFrom('project_task')
            .select(['fk_team_id', 'fk_member_id', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.fk_team_id).toBe(teamId);
        expect(taskDb.fk_member_id).toBeNull();
        expect(taskDb.version).toBe(2);
    });

    it('should allow assigning a member to a task', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    memberId: member.id,
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.data.task.update.assignedMember.id).toBe(member.id);
        const taskDb = await db
            .selectFrom('project_task')
            .select(['fk_member_id', 'fk_team_id', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.fk_member_id).toBe(member.id);
        expect(taskDb.fk_team_id).toBeNull();
        expect(taskDb.version).toBe(2);
    });

    it('should fail when assigning a member who is NOT in the project', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    memberId: stranger.id,
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain(
            'Unauthorized or validation failed',
        );

        const taskDb = await db
            .selectFrom('project_task')
            .select(['fk_member_id', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.fk_member_id).toBeNull();
        expect(taskDb.version).toBe(1);
    });

    it('should fail if member is assigned to a team they are NOT part of', async () => {
        // member is in project but NOT in team
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    teamId,
                    memberId: member.id,
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        const taskDb = await db
            .selectFrom('project_task')
            .select(['fk_team_id', 'fk_member_id', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.fk_team_id).toBeNull();
        expect(taskDb.fk_member_id).toBeNull();
        expect(taskDb.version).toBe(1);
    });

    it('should succeed if member IS in the assigned team and update team tasks_count', async () => {
        // [1] Add member to team
        await db
            .insertInto('project_team_member')
            .values({
                fk_team_id: teamId,
                fk_user_id: member.id,
                fk_project_id: projectId,
            })
            .execute();

        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    teamId,
                    memberId: member.id,
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.status).toBe(200);
        expect(res.body.data.task.update.team.id).toBe(teamId);
        expect(res.body.data.task.update.assignedMember.id).toBe(member.id);

        const taskDb = await db
            .selectFrom('project_task')
            .select(['fk_team_id', 'fk_member_id', 'version', 'updated_by'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.fk_team_id).toBe(teamId);
        expect(taskDb.fk_member_id).toBe(member.id);
        expect(taskDb.version).toBe(2);
        expect(taskDb.updated_by).toBe(owner.id);

        // Verify Team Counter (Eventually Consistent)
        let team: any;
        for (let i = 0; i < 20; i++) {
            team = await db
                .selectFrom('project_team')
                .where('id', '=', teamId)
                .select('tasks_count')
                .executeTakeFirst();
            if (team?.tasks_count === 1) break;
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(team?.tasks_count).toBe(1);
    });

    it('should fail with conflict error if version is mismatched (Optimistic Locking)', async () => {
        // First update works
        await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: { projectId, title: 'Updated V2', version: 1 },
            },
            token: ownerToken,
        });

        // Second update with same version 1 fails
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: { projectId, title: 'Updated V3', version: 1 },
            },
            token: ownerToken,
        });

        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('version mismatch');

        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Updated V2');
        expect(taskDb.version).toBe(2);
    });

    it('should allow a project member to update a task', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    title: 'Member Update',
                    version: 1,
                },
            },
            token: memberToken,
        });

        expect(res.body.data.task.update.title).toBe('Member Update');
        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'updated_by', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Member Update');
        expect(taskDb.updated_by).toBe(member.id);
        expect(taskDb.version).toBe(2);
    });

    it('should fail when a stranger tries to update a task', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    title: 'Stranger Update',
                    version: 1,
                },
            },
            token: strangerToken,
        });

        expect(res.body.errors).toBeDefined();
        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Initial Task');
        expect(taskDb.version).toBe(1);
    });

    it('should fail if title is too short', async () => {
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    title: 'A',
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors[0].message).toContain('between 3 and 255');
        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Initial Task');
        expect(taskDb.version).toBe(1);
    });

    it('should fail if task does not exist', async () => {
        const fakeTaskId = '00000000-0000-0000-0000-000000000000';
        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId: fakeTaskId,
                input: {
                    projectId,
                    title: 'Fake Task Update',
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors[0].message).toContain('not found');
        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Initial Task');
        expect(taskDb.version).toBe(1);
    });

    it('should fail if project ID does not match the task', async () => {
        // Create another project
        const p2Res = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Project 2' },
            token: ownerToken,
        });
        const p2Id = p2Res.body.data.createProject.id;

        const res = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId: p2Id,
                    title: 'Cross Project Update',
                    version: 1,
                },
            },
            token: ownerToken,
        });

        expect(res.body.errors[0].message).toContain('not found');
        const taskDb = await db
            .selectFrom('project_task')
            .select(['title', 'fk_project_id', 'version'])
            .where('id', '=', taskId)
            .executeTakeFirstOrThrow();
        expect(taskDb.title).toBe('Initial Task');
        expect(taskDb.fk_project_id).toBe(projectId);
        expect(taskDb.version).toBe(1);
    });
});
