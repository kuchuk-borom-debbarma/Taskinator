import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../infra/__tests__/helpers/db.ts';
import { db } from '../../../infra/database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, UPDATE_TASK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const ADD_COMMENT = `
  mutation AddComment($taskId: ID!, $content: String!) {
    task {
      addComment(taskId: $taskId, content: $content) {
        id
        content
        version
        author {
          id
          username
        }
      }
    }
  }
`;

const UPDATE_COMMENT = `
  mutation UpdateComment($commentId: ID!, $content: String!, $version: Int!) {
    task {
      updateComment(commentId: $commentId, content: $content, version: $version) {
        id
        content
        version
      }
    }
  }
`;

const DELETE_COMMENT = `
  mutation DeleteComment($commentId: ID!) {
    task {
      deleteComment(commentId: $commentId)
    }
  }
`;

const GET_COMMENTS = `
  query GetTaskComments($taskId: ID!) {
    task(id: $taskId) {
      comments {
        edges {
          node {
            id
            content
            author {
              username
            }
          }
        }
      }
    }
  }
`;

const GET_LOGS = `
  query GetTaskLogs($taskId: ID!) {
    task(id: $taskId) {
      activityLogs {
        edges {
          node {
            id
            actionType
            changes {
              field
              oldValue
              newValue
            }
          }
        }
      }
    }
  }
`;

describe('Task Comments and History E2E', () => {
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

        // Setup Users
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

        // Create Project
        const pRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'E2E Comments Project' },
            token: ownerToken,
        });
        projectId = pRes.body.data.createProject.id;

        // Add member to Project
        await db
            .insertInto('project_member')
            .values({ fk_project_id: projectId, fk_user_id: member.id })
            .execute();

        // Create Task
        const taskRes = await gqlRequest({
            query: CREATE_TASK,
            variables: { input: { projectId, title: 'Commentable Task' } },
            token: ownerToken,
        });
        taskId = taskRes.body.data.task.create.id;
    });

    it('should allow authorized users to add, update, delete comments', async () => {
        // 1. Add comment
        const addRes = await gqlRequest({
            query: ADD_COMMENT,
            variables: { taskId, content: 'First test comment' },
            token: memberToken,
        });

        expect(addRes.status).toBe(200);
        const comment = addRes.body.data.task.addComment;
        expect(comment.content).toBe('First test comment');
        expect(comment.author.username).toBe('member');
        const commentId = comment.id;

        // 2. Fetch comments list
        const getRes = await gqlRequest({
            query: GET_COMMENTS,
            variables: { taskId },
            token: ownerToken,
        });
        expect(getRes.status).toBe(200);
        const edges = getRes.body.data.task.comments.edges;
        expect(edges.length).toBe(1);
        expect(edges[0].node.content).toBe('First test comment');

        // 3. Update comment
        const updateRes = await gqlRequest({
            query: UPDATE_COMMENT,
            variables: {
                commentId,
                content: 'Updated comment text',
                version: 1,
            },
            token: memberToken,
        });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.task.updateComment.content).toBe(
            'Updated comment text',
        );
        expect(updateRes.body.data.task.updateComment.version).toBe(2);

        // 4. Update comment conflict check
        const conflictRes = await gqlRequest({
            query: UPDATE_COMMENT,
            variables: {
                commentId,
                content: 'Conflicting comment text',
                version: 1,
            },
            token: memberToken,
        });
        expect(conflictRes.body.errors).toBeDefined();

        // 5. Delete comment
        const deleteRes = await gqlRequest({
            query: DELETE_COMMENT,
            variables: { commentId },
            token: memberToken,
        });
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.data.task.deleteComment).toBe(commentId);
    });

    it('should block unauthorized users from commenting or viewing comments', async () => {
        const addRes = await gqlRequest({
            query: ADD_COMMENT,
            variables: { taskId, content: 'Stranger comment' },
            token: strangerToken,
        });
        expect(addRes.body.errors).toBeDefined();

        const getRes = await gqlRequest({
            query: GET_COMMENTS,
            variables: { taskId },
            token: strangerToken,
        });
        expect(getRes.body.errors).toBeDefined();
    });

    it('should generate activity logs asynchronously when a task is updated', async () => {
        // [1] Verify creation log (it is created asynchronously, let's poll for a bit to accommodate outbox relay speed)
        let creationLog: any;
        for (let i = 0; i < 20; i++) {
            const logsRes = await gqlRequest({
                query: GET_LOGS,
                variables: { taskId },
                token: ownerToken,
            });
            const edges = logsRes.body.data.task.activityLogs.edges;
            if (edges.length >= 1) {
                creationLog = edges[0].node;
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        expect(creationLog).toBeDefined();
        expect(creationLog.actionType).toBe('task.created');

        // [2] Update task status
        const updateRes = await gqlRequest({
            query: UPDATE_TASK,
            variables: {
                taskId,
                input: {
                    projectId,
                    status: 'DONE',
                    version: 1,
                },
            },
            token: ownerToken,
        });
        expect(updateRes.status).toBe(200);

        // [3] Poll for status update log
        let updateLog: any;
        for (let i = 0; i < 20; i++) {
            const logsRes = await gqlRequest({
                query: GET_LOGS,
                variables: { taskId },
                token: ownerToken,
            });
            const edges = logsRes.body.data.task.activityLogs.edges;
            if (edges.length >= 2) {
                updateLog = edges[0].node;
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        expect(updateLog).toBeDefined();
        expect(updateLog.actionType).toBe('task.updated');
        expect(updateLog.changes[0].field).toBe('status');
        expect(updateLog.changes[0].oldValue).toBe('TODO');
        expect(updateLog.changes[0].newValue).toBe('DONE');
    });
});
