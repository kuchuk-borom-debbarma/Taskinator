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
    "\n      query GetMyProjects($first: Int, $after: String) {\n        me {\n          projects(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                description\n                createdAt\n                updatedAt\n                version\n                creator { id username }\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n            totalCount\n          }\n        }\n      }\n    ": typeof types.GetMyProjectsDocument,
    "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": typeof types.GetProjectDocument,
    "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": typeof types.CreateProjectDocument,
    "\n      mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {\n        updateProject(id: $id, version: $version, name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": typeof types.UpdateProjectDocument,
    "\n      mutation DeleteProjects($projectIds: [ID!]!) {\n        deleteProjects(projectIds: $projectIds) {\n          success\n          deletedCount\n        }\n      }\n    ": typeof types.DeleteProjectsDocument,
    "\n      mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {\n        addProjectMembers(projectId: $projectId, userIds: $userIds) {\n          success\n        }\n      }\n    ": typeof types.AddProjectMembersDocument,
    "\n      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {\n        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {\n          success\n        }\n      }\n    ": typeof types.RemoveProjectMembersDocument,
    "\n      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          projectMembers(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                user { id username }\n                createdAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    ": typeof types.GetProjectMembersDocument,
    "\n      query GetProjectTeams($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          teams(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                createdBy { id username }\n                createdAt\n                updatedAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    ": typeof types.GetProjectTeamsDocument,
    "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {\n        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {\n          edges {\n            node {\n              id\n              user { id username }\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": typeof types.GetTeamMembersDocument,
    "\n      mutation CreateTeam($projectId: ID!, $name: String!) {\n        createTeam(projectId: $projectId, name: $name) {\n          success\n          team {\n            id\n            name\n            createdBy { id username }\n            createdAt\n            version\n          }\n        }\n      }\n    ": typeof types.CreateTeamDocument,
    "\n      mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {\n        deleteTeams(projectId: $projectId, teamIds: $teamIds) {\n          success\n          deletedCount\n        }\n      }\n    ": typeof types.DeleteTeamsDocument,
    "\n      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    ": typeof types.AddTeamMembersDocument,
    "\n      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    ": typeof types.RemoveTeamMembersDocument,
};
const documents: Documents = {
    "\n      query GetMyProjects($first: Int, $after: String) {\n        me {\n          projects(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                description\n                createdAt\n                updatedAt\n                version\n                creator { id username }\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n            totalCount\n          }\n        }\n      }\n    ": types.GetMyProjectsDocument,
    "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": types.GetProjectDocument,
    "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": types.CreateProjectDocument,
    "\n      mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {\n        updateProject(id: $id, version: $version, name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    ": types.UpdateProjectDocument,
    "\n      mutation DeleteProjects($projectIds: [ID!]!) {\n        deleteProjects(projectIds: $projectIds) {\n          success\n          deletedCount\n        }\n      }\n    ": types.DeleteProjectsDocument,
    "\n      mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {\n        addProjectMembers(projectId: $projectId, userIds: $userIds) {\n          success\n        }\n      }\n    ": types.AddProjectMembersDocument,
    "\n      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {\n        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {\n          success\n        }\n      }\n    ": types.RemoveProjectMembersDocument,
    "\n      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          projectMembers(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                user { id username }\n                createdAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    ": types.GetProjectMembersDocument,
    "\n      query GetProjectTeams($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          teams(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                createdBy { id username }\n                createdAt\n                updatedAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    ": types.GetProjectTeamsDocument,
    "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {\n        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {\n          edges {\n            node {\n              id\n              user { id username }\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    ": types.GetTeamMembersDocument,
    "\n      mutation CreateTeam($projectId: ID!, $name: String!) {\n        createTeam(projectId: $projectId, name: $name) {\n          success\n          team {\n            id\n            name\n            createdBy { id username }\n            createdAt\n            version\n          }\n        }\n      }\n    ": types.CreateTeamDocument,
    "\n      mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {\n        deleteTeams(projectId: $projectId, teamIds: $teamIds) {\n          success\n          deletedCount\n        }\n      }\n    ": types.DeleteTeamsDocument,
    "\n      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    ": types.AddTeamMembersDocument,
    "\n      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    ": types.RemoveTeamMembersDocument,
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
export function graphql(source: "\n      query GetMyProjects($first: Int, $after: String) {\n        me {\n          projects(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                description\n                createdAt\n                updatedAt\n                version\n                creator { id username }\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n            totalCount\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetMyProjects($first: Int, $after: String) {\n        me {\n          projects(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                description\n                createdAt\n                updatedAt\n                version\n                creator { id username }\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n            totalCount\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "): (typeof documents)["\n      query GetProject($id: ID!) {\n        project(id: $id) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "): (typeof documents)["\n      mutation CreateProject($name: String!, $description: String) {\n        createProject(name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {\n        updateProject(id: $id, version: $version, name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "): (typeof documents)["\n      mutation UpdateProject($id: ID!, $version: Int!, $name: String, $description: String) {\n        updateProject(id: $id, version: $version, name: $name, description: $description) {\n          id\n          name\n          description\n          createdAt\n          updatedAt\n          version\n          creator { id username }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation DeleteProjects($projectIds: [ID!]!) {\n        deleteProjects(projectIds: $projectIds) {\n          success\n          deletedCount\n        }\n      }\n    "): (typeof documents)["\n      mutation DeleteProjects($projectIds: [ID!]!) {\n        deleteProjects(projectIds: $projectIds) {\n          success\n          deletedCount\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {\n        addProjectMembers(projectId: $projectId, userIds: $userIds) {\n          success\n        }\n      }\n    "): (typeof documents)["\n      mutation AddProjectMembers($projectId: ID!, $userIds: [ID!]!) {\n        addProjectMembers(projectId: $projectId, userIds: $userIds) {\n          success\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {\n        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {\n          success\n        }\n      }\n    "): (typeof documents)["\n      mutation RemoveProjectMembers($projectId: ID!, $memberIds: [ID!]!) {\n        removeProjectMembers(projectId: $projectId, memberIds: $memberIds) {\n          success\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          projectMembers(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                user { id username }\n                createdAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetProjectMembers($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          projectMembers(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                user { id username }\n                createdAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetProjectTeams($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          teams(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                createdBy { id username }\n                createdAt\n                updatedAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetProjectTeams($projectId: ID!, $first: Int, $after: String) {\n        project(id: $projectId) {\n          teams(first: $first, after: $after) {\n            edges {\n              node {\n                id\n                name\n                createdBy { id username }\n                createdAt\n                updatedAt\n                version\n              }\n            }\n            pageInfo {\n              hasNextPage\n              endCursor\n            }\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {\n        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {\n          edges {\n            node {\n              id\n              user { id username }\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "): (typeof documents)["\n      query GetTeamMembers($projectId: ID!, $teamId: ID!, $first: Int, $after: String) {\n        teamMembers(projectId: $projectId, teamId: $teamId, first: $first, after: $after) {\n          edges {\n            node {\n              id\n              user { id username }\n              createdAt\n              version\n            }\n          }\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation CreateTeam($projectId: ID!, $name: String!) {\n        createTeam(projectId: $projectId, name: $name) {\n          success\n          team {\n            id\n            name\n            createdBy { id username }\n            createdAt\n            version\n          }\n        }\n      }\n    "): (typeof documents)["\n      mutation CreateTeam($projectId: ID!, $name: String!) {\n        createTeam(projectId: $projectId, name: $name) {\n          success\n          team {\n            id\n            name\n            createdBy { id username }\n            createdAt\n            version\n          }\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {\n        deleteTeams(projectId: $projectId, teamIds: $teamIds) {\n          success\n          deletedCount\n        }\n      }\n    "): (typeof documents)["\n      mutation DeleteTeams($projectId: ID!, $teamIds: [ID!]!) {\n        deleteTeams(projectId: $projectId, teamIds: $teamIds) {\n          success\n          deletedCount\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    "): (typeof documents)["\n      mutation AddTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        addTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    "): (typeof documents)["\n      mutation RemoveTeamMembers($projectId: ID!, $teamId: ID!, $userIds: [ID!]!) {\n        removeTeamMembers(projectId: $projectId, teamId: $teamId, userIds: $userIds) {\n          success\n        }\n      }\n    "];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;