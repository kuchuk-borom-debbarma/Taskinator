/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n      query GetProjects($first: Int, $after: String) {\n        projects(first: $first, after: $after) {\n          edges {\n            node {\n              id\n              name\n              description\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": typeof types.GetProjectsDocument,
    "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    ": typeof types.GetProjectDocument,
    "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    ": typeof types.CreateProjectDocument,
    "\n      query GetProjectTasks($projectId: ID!) {\n        projectTasks(projectId: $projectId) {\n          edges {\n            node {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n          }\n        }\n      }\n    ": typeof types.GetProjectTasksDocument,
    "\n      query GetTask($id: ID!) {\n        task(id: $id) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": typeof types.GetTaskDocument,
    "\n      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $first: Int, $after: String) {\n        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, first: $first, after: $after) {\n          focusedTask {\n            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n            team { id name }\n            assignee { id username }\n          }\n          nodes {\n            task {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n            depth\n            direction\n          }\n          edges {\n            id projectId sourceTaskId targetTaskId label createdAt\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": typeof types.GetNeighbourhoodDocument,
    "\n      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {\n        createTask(projectId: $projectId, title: $title, description: $description) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": typeof types.CreateTaskDocument,
    "\n      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {\n        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": typeof types.UpdateTaskDocument,
    "\n      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {\n        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {\n          id projectId sourceTaskId targetTaskId label createdAt\n        }\n      }\n    ": typeof types.CreateLinkDocument,
    "\n      query GetTeams($projectId: ID!) {\n        teams(projectId: $projectId) {\n          edges {\n            node {\n              id\n              name\n              projectId\n            }\n          }\n        }\n      }\n    ": typeof types.GetTeamsDocument,
    "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!) {\n        teamMembers(projectId: $projectId, teamId: $teamId) {\n          edges {\n            node {\n              id\n              user {\n                id\n                username\n                email\n              }\n            }\n          }\n        }\n      }\n    ": typeof types.GetTeamMembersDocument,
};
const documents: Documents = {
    "\n      query GetProjects($first: Int, $after: String) {\n        projects(first: $first, after: $after) {\n          edges {\n            node {\n              id\n              name\n              description\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": types.GetProjectsDocument,
    "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    ": types.GetProjectDocument,
    "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    ": types.CreateProjectDocument,
    "\n      query GetProjectTasks($projectId: ID!) {\n        projectTasks(projectId: $projectId) {\n          edges {\n            node {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n          }\n        }\n      }\n    ": types.GetProjectTasksDocument,
    "\n      query GetTask($id: ID!) {\n        task(id: $id) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": types.GetTaskDocument,
    "\n      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $first: Int, $after: String) {\n        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, first: $first, after: $after) {\n          focusedTask {\n            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n            team { id name }\n            assignee { id username }\n          }\n          nodes {\n            task {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n            depth\n            direction\n          }\n          edges {\n            id projectId sourceTaskId targetTaskId label createdAt\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": types.GetNeighbourhoodDocument,
    "\n      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {\n        createTask(projectId: $projectId, title: $title, description: $description) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": types.CreateTaskDocument,
    "\n      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {\n        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    ": types.UpdateTaskDocument,
    "\n      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {\n        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {\n          id projectId sourceTaskId targetTaskId label createdAt\n        }\n      }\n    ": types.CreateLinkDocument,
    "\n      query GetTeams($projectId: ID!) {\n        teams(projectId: $projectId) {\n          edges {\n            node {\n              id\n              name\n              projectId\n            }\n          }\n        }\n      }\n    ": types.GetTeamsDocument,
    "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!) {\n        teamMembers(projectId: $projectId, teamId: $teamId) {\n          edges {\n            node {\n              id\n              user {\n                id\n                username\n                email\n              }\n            }\n          }\n        }\n      }\n    ": types.GetTeamMembersDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProjects($first: Int, $after: String) {\n        projects(first: $first, after: $after) {\n          edges {\n            node {\n              id\n              name\n              description\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetProjects($first: Int, $after: String) {\n        projects(first: $first, after: $after) {\n          edges {\n            node {\n              id\n              name\n              description\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    "): (typeof documents)["\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    "): (typeof documents)["\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          version\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProjectTasks($projectId: ID!) {\n        projectTasks(projectId: $projectId) {\n          edges {\n            node {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetProjectTasks($projectId: ID!) {\n        projectTasks(projectId: $projectId) {\n          edges {\n            node {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetTask($id: ID!) {\n        task(id: $id) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "): (typeof documents)["\n      query GetTask($id: ID!) {\n        task(id: $id) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $first: Int, $after: String) {\n        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, first: $first, after: $after) {\n          focusedTask {\n            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n            team { id name }\n            assignee { id username }\n          }\n          nodes {\n            task {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n            depth\n            direction\n          }\n          edges {\n            id projectId sourceTaskId targetTaskId label createdAt\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetNeighbourhood($projectId: ID!, $taskId: ID!, $maxDepth: Int, $first: Int, $after: String) {\n        taskNeighbourhood(projectId: $projectId, taskId: $taskId, maxDepth: $maxDepth, first: $first, after: $after) {\n          focusedTask {\n            id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n            team { id name }\n            assignee { id username }\n          }\n          nodes {\n            task {\n              id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n              team { id name }\n              assignee { id username }\n            }\n            depth\n            direction\n          }\n          edges {\n            id projectId sourceTaskId targetTaskId label createdAt\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {\n        createTask(projectId: $projectId, title: $title, description: $description) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "): (typeof documents)["\n      mutation CreateTask($projectId: ID!, $title: String!, $description: String) {\n        createTask(projectId: $projectId, title: $title, description: $description) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {\n        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "): (typeof documents)["\n      mutation UpdateTask($taskId: ID!, $title: String, $description: String, $status: String) {\n        updateTask(taskId: $taskId, title: $title, description: $description, status: $status) {\n          id projectId teamId memberId title description status priority dueDate version createdAt updatedAt createdBy\n          team { id name }\n          assignee { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {\n        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {\n          id projectId sourceTaskId targetTaskId label createdAt\n        }\n      }\n    "): (typeof documents)["\n      mutation CreateLink($projectId: ID!, $sourceId: ID!, $targetId: ID!, $label: String!) {\n        createTaskLink(projectId: $projectId, sourceTaskId: $sourceId, targetTaskId: $targetId, label: $label) {\n          id projectId sourceTaskId targetTaskId label createdAt\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetTeams($projectId: ID!) {\n        teams(projectId: $projectId) {\n          edges {\n            node {\n              id\n              name\n              projectId\n            }\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetTeams($projectId: ID!) {\n        teams(projectId: $projectId) {\n          edges {\n            node {\n              id\n              name\n              projectId\n            }\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!) {\n        teamMembers(projectId: $projectId, teamId: $teamId) {\n          edges {\n            node {\n              id\n              user {\n                id\n                username\n                email\n              }\n            }\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetTeamMembers($projectId: ID!, $teamId: ID!) {\n        teamMembers(projectId: $projectId, teamId: $teamId) {\n          edges {\n            node {\n              id\n              user {\n                id\n                username\n                email\n              }\n            }\n          }\n        }\n      }\n    "];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;