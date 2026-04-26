import jwt from 'jsonwebtoken';
import { cleanupDb } from '../../../__tests__/helpers/db.ts';
import { db } from '../../../database/index.ts';
import { gqlRequest } from '../helpers/request.ts';
import { bootstrapE2E, teardownE2E } from '../helpers/server.ts';
import { CREATE_PROJECT } from '../project/mutation.ts';
import { CREATE_TASK, CREATE_TASK_LINK } from './mutation.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

const GET_TASK_NEIGHBOUR_LINKS = `
  query GetTaskNeighbourLinks($taskId: ID!, $first: Int, $after: String) {
    task(id: $taskId) {
      neighbourLinks(direction: both, first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            label
            source { id }
            target { id }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  }
`;

describe('Task Neighbour Links E2E', () => {
    let owner: any;
    let ownerToken: string;
    let projectId: string;
    let taskAId: string;
    let taskBId: string;
    let taskCId: string;
    let taskDId: string;
    let taskEId: string;

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

        ownerToken = jwt.sign(
            { id: owner.id, email: owner.email, username: owner.username },
            JWT_SECRET,
        );

        const projectRes = await gqlRequest({
            query: CREATE_PROJECT,
            variables: { name: 'Graph Project' },
            token: ownerToken,
        });
        projectId = projectRes.body.data.createProject.id;

        const createTask = async (title: string) => {
            const res = await gqlRequest({
                query: CREATE_TASK,
                variables: { input: { projectId, title } },
                token: ownerToken,
            });
            return res.body.data.task.create.id as string;
        };

        taskAId = await createTask('Task A');
        taskBId = await createTask('Task B');
        taskCId = await createTask('Task C');
        taskDId = await createTask('Task D');
        taskEId = await createTask('Task E');
    });

    it('paginates graph neighbours by depth first, then createdAt/id', async () => {
        const createLink = async (
            sourceTaskId: string,
            targetTaskId: string,
            label: string,
        ) => {
            const res = await gqlRequest({
                query: CREATE_TASK_LINK,
                variables: {
                    input: { projectId, sourceTaskId, targetTaskId, label },
                },
                token: ownerToken,
            });
            expect(res.status).toBe(200);
            await new Promise((resolve) => setTimeout(resolve, 20));
            return res.body.data.task.createLink.id as string;
        };

        const linkBA = await createLink(taskBId, taskAId, 'incoming-direct');
        const linkAC = await createLink(taskAId, taskCId, 'outgoing-direct');
        const linkDB = await createLink(taskDId, taskBId, 'incoming-depth-2');
        const linkCE = await createLink(taskCId, taskEId, 'outgoing-depth-2');

        const firstPage = await gqlRequest({
            query: GET_TASK_NEIGHBOUR_LINKS,
            variables: { taskId: taskAId, first: 2 },
            token: ownerToken,
        });

        expect(firstPage.status).toBe(200);
        const firstConn = firstPage.body.data.task.neighbourLinks;
        expect(firstConn.pageInfo.hasNextPage).toBe(true);
        expect(firstConn.edges).toHaveLength(2);
        expect(firstConn.edges.map((edge: any) => edge.node.id)).toEqual([
            linkAC,
            linkBA,
        ]);

        const secondPage = await gqlRequest({
            query: GET_TASK_NEIGHBOUR_LINKS,
            variables: {
                taskId: taskAId,
                first: 2,
                after: firstConn.pageInfo.endCursor,
            },
            token: ownerToken,
        });

        expect(secondPage.status).toBe(200);
        const secondConn = secondPage.body.data.task.neighbourLinks;
        expect(secondConn.edges).toHaveLength(2);
        expect(secondConn.edges.map((edge: any) => edge.node.id)).toEqual([
            linkCE,
            linkDB,
        ]);
        expect(secondConn.pageInfo.hasNextPage).toBe(false);
    });
});
