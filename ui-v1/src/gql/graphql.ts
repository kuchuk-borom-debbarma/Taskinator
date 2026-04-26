/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AddProjectMembersPayload = {
  __typename?: 'AddProjectMembersPayload';
  success: Scalars['Boolean']['output'];
};

export type AddTeamMembersPayload = {
  __typename?: 'AddTeamMembersPayload';
  /** Number of members successfully added. */
  addedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type CreateTaskInput = {
  /** Full description of the task's goal or acceptance criteria. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Project to create the task in. */
  projectId: Scalars['ID']['input'];
  /** Initial lifecycle status. Defaults to server-defined value if omitted. */
  status?: InputMaybe<Scalars['String']['input']>;
  /** Short, human-readable title. */
  title: Scalars['String']['input'];
};

export type CreateTaskLinkInput = {
  /** Semantic label for the relationship (e.g. "blocks", "relates to"). */
  label: Scalars['String']['input'];
  /** Project both tasks belong to. */
  projectId: Scalars['ID']['input'];
  /** The originating task (dependency source). */
  sourceTaskId: Scalars['ID']['input'];
  /** The destination task (dependency target). */
  targetTaskId: Scalars['ID']['input'];
};

export type CreateTeamPayload = {
  __typename?: 'CreateTeamPayload';
  success: Scalars['Boolean']['output'];
  /** The newly created team. */
  team?: Maybe<Team>;
};

export type DeleteProjectsPayload = {
  __typename?: 'DeleteProjectsPayload';
  /** Number of projects successfully deleted. */
  deletedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type DeleteTeamsPayload = {
  __typename?: 'DeleteTeamsPayload';
  /** Number of teams successfully deleted. */
  deletedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

export type InternalNotification = {
  __typename?: 'InternalNotification';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isRead: Scalars['Boolean']['output'];
  message: Scalars['String']['output'];
  metadata?: Maybe<Scalars['String']['output']>;
  readAt?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  type: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Adds one or more users as members of a project. */
  addProjectMembers: AddProjectMembersPayload;
  /** Adds one or more users as members of a team. */
  addTeamMembers: AddTeamMembersPayload;
  /** Creates a new project. Returns the created project. */
  createProject?: Maybe<Project>;
  /** Creates a new team within a project. */
  createTeam: CreateTeamPayload;
  /** Permanently deletes one or more projects. */
  deleteProjects: DeleteProjectsPayload;
  /** Permanently deletes one or more teams within a project. */
  deleteTeams: DeleteTeamsPayload;
  markAllNotificationsAsRead?: Maybe<Scalars['Boolean']['output']>;
  markNotificationAsRead?: Maybe<Scalars['Boolean']['output']>;
  /** Removes one or more members from a project. */
  removeProjectMembers: RemoveProjectMembersPayload;
  /** Removes one or more members from a team. */
  removeTeamMembers: RemoveTeamMembersPayload;
  /** Signs in a user and returns a JWT token. */
  signIn: SignInPayload;
  task: TaskMutation;
  /** Updates a project's name or description. Returns the updated project. */
  updateProject?: Maybe<Project>;
  /** Updates a team's details with optimistic locking. */
  updateTeam: UpdateTeamPayload;
};


export type MutationAddProjectMembersArgs = {
  projectId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationAddTeamMembersArgs = {
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationCreateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateTeamArgs = {
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationDeleteProjectsArgs = {
  projectIds: Array<Scalars['ID']['input']>;
};


export type MutationDeleteTeamsArgs = {
  projectId: Scalars['ID']['input'];
  teamIds: Array<Scalars['ID']['input']>;
};


export type MutationMarkNotificationAsReadArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveProjectMembersArgs = {
  memberIds: Array<Scalars['ID']['input']>;
  projectId: Scalars['ID']['input'];
};


export type MutationRemoveTeamMembersArgs = {
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']>;
};


export type MutationSignInArgs = {
  email: Scalars['String']['input'];
  password_raw: Scalars['String']['input'];
};


export type MutationUpdateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  version: Scalars['Int']['input'];
};


export type MutationUpdateTeamArgs = {
  name: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
};

/** Direction of a link relative to the focused task. */
export type NeighbourDirection =
  /** Links in either direction. */
  | 'both'
  /** Links where this task is the target. */
  | 'incoming'
  /** Links where this task is the source. */
  | 'outgoing';

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  edges: Array<NotificationEdge>;
  pageInfo: PageInfo;
};

export type NotificationEdge = {
  __typename?: 'NotificationEdge';
  cursor: Scalars['String']['output'];
  node: InternalNotification;
};

/** Relay cursor-based pagination metadata returned on every connection. */
export type PageInfo = {
  __typename?: 'PageInfo';
  /** Cursor of the last edge in the current page. Use with `after` to paginate forwards. */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether there are more results after the current page. */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more results before the current page. */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Cursor of the first edge in the current page. Use with `before` to paginate backwards. */
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** A workspace that groups tasks, teams, and members together. */
export type Project = {
  __typename?: 'Project';
  /** Tasks assigned to the currently authenticated user within this project. */
  assignedTasks: TaskConnection;
  /** ISO 8601 creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** User who created this project. */
  creator: User;
  /** Optional description of the project's purpose or scope. */
  description?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the project. */
  id: Scalars['ID']['output'];
  /** Display name of the project. */
  name: Scalars['String']['output'];
  /** Paginated list of members belonging to this project. */
  projectMembers: ProjectMemberConnection;
  projectMembersCount: Scalars['Int']['output'];
  /**
   * Paginated list of all tasks in this project.
   * Optionally filtered by team or assigned member.
   */
  projectTasks: TaskConnection;
  tasksCount: Scalars['Int']['output'];
  /** Paginated list of teams within this project. */
  teams: TeamConnection;
  teamsCount: Scalars['Int']['output'];
  /** ISO 8601 last-updated timestamp. */
  updatedAt?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};


/** A workspace that groups tasks, teams, and members together. */
export type ProjectAssignedTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A workspace that groups tasks, teams, and members together. */
export type ProjectProjectMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A workspace that groups tasks, teams, and members together. */
export type ProjectProjectTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  memberId?: InputMaybe<Scalars['ID']['input']>;
  teamId?: InputMaybe<Scalars['ID']['input']>;
};


/** A workspace that groups tasks, teams, and members together. */
export type ProjectTeamsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Relay-style paginated list of projects. */
export type ProjectConnection = {
  __typename?: 'ProjectConnection';
  edges: Array<ProjectEdge>;
  pageInfo: PageInfo;
  /** Total number of projects matching the query, regardless of pagination. */
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type ProjectEdge = {
  __typename?: 'ProjectEdge';
  cursor: Scalars['String']['output'];
  node: Project;
};

/** A membership record joining a user to a project. */
export type ProjectMember = {
  __typename?: 'ProjectMember';
  /** ISO 8601 timestamp of when the user joined the project. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for this membership record. */
  id: Scalars['ID']['output'];
  /** The project this membership belongs to. */
  project: Project;
  /** The user who is a member of the project. */
  user?: Maybe<User>;
  /**
   * Optimistic-concurrency version counter.
   * Incremented on every write. Use to detect stale updates.
   */
  version: Scalars['Int']['output'];
};

/** Relay-style paginated list of project members. */
export type ProjectMemberConnection = {
  __typename?: 'ProjectMemberConnection';
  edges: Array<ProjectMemberEdge>;
  pageInfo: PageInfo;
};

export type ProjectMemberEdge = {
  __typename?: 'ProjectMemberEdge';
  cursor: Scalars['String']['output'];
  node: ProjectMember;
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  /** Returns the currently authenticated user. Returns null if unauthenticated. */
  me?: Maybe<User>;
  notifications: NotificationConnection;
  /** Fetches a single project by ID. Returns null if not found or not authorized. */
  project?: Maybe<Project>;
  /** Fetches multiple projects by ID. Returns only those the user is authorized to view. */
  projects: Array<Project>;
  /** Fetches a single task by ID. Returns null if not found or not authorized. */
  task?: Maybe<Task>;
  /** Fetches multiple tasks by ID. Returns only those the user is authorized to view. */
  tasks: Array<Task>;
  /** Fetches a single team by ID. */
  team?: Maybe<Team>;
  /** Fetches a paginated list of members for a given team. */
  teamMembers: TeamMemberConnection;
  /** Fetches multiple teams by ID. */
  teams: Array<Team>;
  unreadNotificationsCount: Scalars['Int']['output'];
  /** Fetches a single user by ID. */
  user?: Maybe<User>;
  /** Fetches multiple users by ID. */
  users: Array<User>;
};


export type QueryNotificationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTasksArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type QueryTeamArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTeamMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
};


export type QueryTeamsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUsersArgs = {
  ids: Array<Scalars['ID']['input']>;
};

export type RealtimeEvent = InternalNotification;

export type RemoveProjectMembersPayload = {
  __typename?: 'RemoveProjectMembersPayload';
  success: Scalars['Boolean']['output'];
};

export type RemoveTeamMembersPayload = {
  __typename?: 'RemoveTeamMembersPayload';
  /** Number of members successfully removed. */
  removedCount: Scalars['Int']['output'];
  success: Scalars['Boolean']['output'];
};

/** Payload for the signIn mutation. */
export type SignInPayload = {
  __typename?: 'SignInPayload';
  token?: Maybe<Scalars['String']['output']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  _empty?: Maybe<Scalars['String']['output']>;
  /**
   * A unified real-time stream for all events relevant to the authenticated user.
   * Automatically filters notifications by userId.
   */
  realtimeStream: RealtimeEvent;
};


export type SubscriptionRealtimeStreamArgs = {
  projectId?: InputMaybe<Scalars['String']['input']>;
};

/** A single unit of work within a project. */
export type Task = {
  __typename?: 'Task';
  /** Individual user assigned to this task. */
  assignedMember?: Maybe<User>;
  /** ISO 8601 creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** User who created this task. */
  createdBy: User;
  /** Full description of the task's goal or acceptance criteria. */
  description: Scalars['String']['output'];
  /** Optional ISO 8601 due date. */
  dueDate?: Maybe<Scalars['String']['output']>;
  /** Unique identifier for the task. */
  id: Scalars['ID']['output'];
  /**
   * All task links connected to this task up to a given depth.
   * Use `direction` to filter to incoming or outgoing links only.
   * The client is responsible for building the graph from the returned edges.
   */
  neighbourLinks: TaskLinkConnection;
  /** Numeric priority. Lower values indicate higher urgency. */
  priority: Scalars['Int']['output'];
  /** Project this task belongs to. */
  project?: Maybe<Project>;
  /** Current lifecycle status (e.g. "todo", "in_progress", "done"). */
  status: Scalars['String']['output'];
  /** Team responsible for this task. */
  team?: Maybe<Team>;
  /** Short, human-readable title. */
  title: Scalars['String']['output'];
  /** ISO 8601 last-updated timestamp. */
  updatedAt: Scalars['String']['output'];
  /** User who last modified this task. */
  updatedBy: User;
  version: Scalars['Int']['output'];
};


/** A single unit of work within a project. */
export type TaskNeighbourLinksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  depthLimit?: InputMaybe<Scalars['Int']['input']>;
  direction?: InputMaybe<NeighbourDirection>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Relay-style paginated list of tasks. */
export type TaskConnection = {
  __typename?: 'TaskConnection';
  edges: Array<TaskEdge>;
  pageInfo: PageInfo;
};

export type TaskEdge = {
  __typename?: 'TaskEdge';
  cursor: Scalars['String']['output'];
  node: Task;
};

/** Aggregated count of a link label across a set of tasks. Useful for summarising dependency types in list views. */
export type TaskLabelCount = {
  __typename?: 'TaskLabelCount';
  count: Scalars['Int']['output'];
  label: Scalars['String']['output'];
};

/** A directed, labelled edge between two tasks. Represents a dependency or relationship. */
export type TaskLink = {
  __typename?: 'TaskLink';
  /** ISO 8601 creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** User who created this link. */
  createdBy: User;
  /** Unique identifier for the link. */
  id: Scalars['ID']['output'];
  /** Semantic label describing the relationship (e.g. "blocks", "relates to"). */
  label: Scalars['String']['output'];
  /** Project this link belongs to. */
  project?: Maybe<Project>;
  /** The originating task (dependency source). */
  source: Task;
  /** The destination task (dependency target). */
  target: Task;
  /** ISO 8601 last-updated timestamp. */
  updatedAt?: Maybe<Scalars['String']['output']>;
  /** User who last modified this link. */
  updatedBy: User;
};

/** Relay-style paginated list of task links. */
export type TaskLinkConnection = {
  __typename?: 'TaskLinkConnection';
  edges: Array<TaskLinkEdge>;
  pageInfo: PageInfo;
};

export type TaskLinkEdge = {
  __typename?: 'TaskLinkEdge';
  cursor: Scalars['String']['output'];
  node: TaskLink;
};

/** Namespaced task mutations. */
export type TaskMutation = {
  __typename?: 'TaskMutation';
  /** Creates a new task in the given project. */
  create: Task;
  /** Creates a directed, labelled link between two tasks. */
  createLink: TaskLink;
  /** Permanently deletes a task. Returns the ID of the deleted task. */
  delete: Scalars['ID']['output'];
  /** Removes a task link by ID. Returns the ID of the deleted link. */
  deleteLink: Scalars['ID']['output'];
  /** Partially updates a task. Only supplied fields are changed; omitted fields are left as-is. */
  update: Task;
  /** Updates a task link (label, source, or target). */
  updateLink: TaskLink;
};


/** Namespaced task mutations. */
export type TaskMutationCreateArgs = {
  input: CreateTaskInput;
};


/** Namespaced task mutations. */
export type TaskMutationCreateLinkArgs = {
  input: CreateTaskLinkInput;
};


/** Namespaced task mutations. */
export type TaskMutationDeleteArgs = {
  projectId: Scalars['ID']['input'];
  taskId: Scalars['ID']['input'];
};


/** Namespaced task mutations. */
export type TaskMutationDeleteLinkArgs = {
  linkId: Scalars['ID']['input'];
  projectId: Scalars['ID']['input'];
};


/** Namespaced task mutations. */
export type TaskMutationUpdateArgs = {
  input: UpdateTaskInput;
  taskId: Scalars['ID']['input'];
};


/** Namespaced task mutations. */
export type TaskMutationUpdateLinkArgs = {
  input: UpdateTaskLinkInput;
};

/** A group of users collaborating within a project. */
export type Team = {
  __typename?: 'Team';
  /** ISO 8601 creation timestamp. */
  createdAt: Scalars['String']['output'];
  /** User who created this team. */
  createdBy: User;
  /** Unique identifier for the team. */
  id: Scalars['ID']['output'];
  /** Paginated list of members belonging to this team. */
  members: TeamMemberConnection;
  /** Number of members in the team. */
  membersCount: Scalars['Int']['output'];
  /** Display name of the team. */
  name: Scalars['String']['output'];
  /** Project this team belongs to. */
  project?: Maybe<Project>;
  /** Paginated list of tasks assigned to this team. */
  tasks: TaskConnection;
  /** Number of tasks assigned to the team. */
  tasksCount: Scalars['Int']['output'];
  /** ISO 8601 last-updated timestamp. */
  updatedAt?: Maybe<Scalars['String']['output']>;
  version: Scalars['Int']['output'];
};


/** A group of users collaborating within a project. */
export type TeamMembersArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


/** A group of users collaborating within a project. */
export type TeamTasksArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Relay-style paginated list of teams. */
export type TeamConnection = {
  __typename?: 'TeamConnection';
  edges: Array<TeamEdge>;
  pageInfo: PageInfo;
};

export type TeamEdge = {
  __typename?: 'TeamEdge';
  cursor: Scalars['String']['output'];
  node: Team;
};

/** A membership record joining a user to a team. */
export type TeamMember = {
  __typename?: 'TeamMember';
  /** ISO 8601 timestamp of when the user joined the team. */
  createdAt: Scalars['String']['output'];
  /** Unique identifier for this membership record. */
  id: Scalars['ID']['output'];
  /** The team this membership belongs to. */
  team?: Maybe<Team>;
  /** The user who is a member of the team. */
  user?: Maybe<User>;
  /**
   * Optimistic-concurrency version counter.
   * Incremented on every write. Use to detect stale updates.
   */
  version: Scalars['Int']['output'];
};

/** Relay-style paginated list of team members. */
export type TeamMemberConnection = {
  __typename?: 'TeamMemberConnection';
  edges: Array<TeamMemberEdge>;
  pageInfo: PageInfo;
};

export type TeamMemberEdge = {
  __typename?: 'TeamMemberEdge';
  cursor: Scalars['String']['output'];
  node: TeamMember;
};

export type UpdateTaskInput = {
  /** Updated description. Omit to leave unchanged. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Member to assign this task to. */
  memberId?: InputMaybe<Scalars['ID']['input']>;
  /** Project the task belongs to. */
  projectId: Scalars['ID']['input'];
  /** Updated status. Omit to leave unchanged. */
  status?: InputMaybe<Scalars['String']['input']>;
  /** Team to assign this task to. */
  teamId?: InputMaybe<Scalars['ID']['input']>;
  /** Updated title. Omit to leave unchanged. */
  title?: InputMaybe<Scalars['String']['input']>;
  /** Optimistic lock version. */
  version: Scalars['Int']['input'];
};

export type UpdateTaskLinkInput = {
  /** Semantic label for the relationship. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The link to update. */
  linkId: Scalars['ID']['input'];
  /** Project both tasks belong to. */
  projectId: Scalars['ID']['input'];
  /** The originating task (dependency source). */
  sourceTaskId?: InputMaybe<Scalars['ID']['input']>;
  /** The destination task (dependency target). */
  targetTaskId?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdateTeamPayload = {
  __typename?: 'UpdateTeamPayload';
  success: Scalars['Boolean']['output'];
  /** The updated team. */
  team?: Maybe<Team>;
};

/** An authenticated user of the application. */
export type User = {
  __typename?: 'User';
  /** The user's email address. */
  email: Scalars['String']['output'];
  /** Unique identifier for the user. */
  id: Scalars['ID']['output'];
  /** All projects the user is a member of. */
  projects: ProjectConnection;
  /** The number of projects the user is a member of. */
  projectsCount: Scalars['Int']['output'];
  /** The user's unique username. */
  username: Scalars['String']['output'];
};


/** An authenticated user of the application. */
export type UserProjectsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

/** Relay-style paginated list of users. */
export type UserConnection = {
  __typename?: 'UserConnection';
  edges: Array<UserEdge>;
  pageInfo: PageInfo;
};

export type UserEdge = {
  __typename?: 'UserEdge';
  cursor: Scalars['String']['output'];
  node: User;
};

export type GetMyProjectsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetMyProjectsQuery = { __typename?: 'Query', me?: { __typename?: 'User', projects: { __typename?: 'ProjectConnection', totalCount?: number | null, edges: Array<{ __typename?: 'ProjectEdge', node: { __typename?: 'Project', id: string, name: string, description?: string | null, createdAt: string, updatedAt?: string | null, version: number, creator: { __typename?: 'User', id: string, username: string } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } } | null };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProjectQuery = { __typename?: 'Query', project?: { __typename?: 'Project', id: string, name: string, description?: string | null, createdAt: string, updatedAt?: string | null, version: number, creator: { __typename?: 'User', id: string, username: string } } | null };

export type CreateProjectMutationVariables = Exact<{
  name: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateProjectMutation = { __typename?: 'Mutation', createProject?: { __typename?: 'Project', id: string, name: string, description?: string | null, createdAt: string, updatedAt?: string | null, version: number, creator: { __typename?: 'User', id: string, username: string } } | null };

export type UpdateProjectMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  version: Scalars['Int']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateProjectMutation = { __typename?: 'Mutation', updateProject?: { __typename?: 'Project', id: string, name: string, description?: string | null, createdAt: string, updatedAt?: string | null, version: number, creator: { __typename?: 'User', id: string, username: string } } | null };

export type DeleteProjectsMutationVariables = Exact<{
  projectIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type DeleteProjectsMutation = { __typename?: 'Mutation', deleteProjects: { __typename?: 'DeleteProjectsPayload', success: boolean, deletedCount: number } };

export type AddProjectMembersMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type AddProjectMembersMutation = { __typename?: 'Mutation', addProjectMembers: { __typename?: 'AddProjectMembersPayload', success: boolean } };

export type RemoveProjectMembersMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  memberIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RemoveProjectMembersMutation = { __typename?: 'Mutation', removeProjectMembers: { __typename?: 'RemoveProjectMembersPayload', success: boolean } };

export type GetProjectMembersQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetProjectMembersQuery = { __typename?: 'Query', project?: { __typename?: 'Project', projectMembers: { __typename?: 'ProjectMemberConnection', edges: Array<{ __typename?: 'ProjectMemberEdge', node: { __typename?: 'ProjectMember', id: string, createdAt: string, version: number, user?: { __typename?: 'User', id: string, username: string } | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } } | null };

export type GetProjectTeamsQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetProjectTeamsQuery = { __typename?: 'Query', project?: { __typename?: 'Project', teams: { __typename?: 'TeamConnection', edges: Array<{ __typename?: 'TeamEdge', node: { __typename?: 'Team', id: string, name: string, createdAt: string, updatedAt?: string | null, version: number, createdBy: { __typename?: 'User', id: string, username: string } } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } } | null };

export type GetTeamMembersQueryVariables = Exact<{
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetTeamMembersQuery = { __typename?: 'Query', teamMembers: { __typename?: 'TeamMemberConnection', edges: Array<{ __typename?: 'TeamMemberEdge', node: { __typename?: 'TeamMember', id: string, createdAt: string, version: number, user?: { __typename?: 'User', id: string, username: string } | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null } } };

export type CreateTeamMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type CreateTeamMutation = { __typename?: 'Mutation', createTeam: { __typename?: 'CreateTeamPayload', success: boolean, team?: { __typename?: 'Team', id: string, name: string, createdAt: string, version: number, createdBy: { __typename?: 'User', id: string, username: string } } | null } };

export type DeleteTeamsMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  teamIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type DeleteTeamsMutation = { __typename?: 'Mutation', deleteTeams: { __typename?: 'DeleteTeamsPayload', success: boolean, deletedCount: number } };

export type AddTeamMembersMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type AddTeamMembersMutation = { __typename?: 'Mutation', addTeamMembers: { __typename?: 'AddTeamMembersPayload', success: boolean } };

export type RemoveTeamMembersMutationVariables = Exact<{
  projectId: Scalars['ID']['input'];
  teamId: Scalars['ID']['input'];
  userIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RemoveTeamMembersMutation = { __typename?: 'Mutation', removeTeamMembers: { __typename?: 'RemoveTeamMembersPayload', success: boolean } };


export const GetMyProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetMyProjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}}]}}]}}]}}]} as unknown as DocumentNode<GetMyProjectsQuery, GetMyProjectsQueryVariables>;
export const GetProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<GetProjectQuery, GetProjectQueryVariables>;
export const CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<CreateProjectMutation, CreateProjectMutationVariables>;
export const UpdateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"creator"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateProjectMutation, UpdateProjectMutationVariables>;
export const DeleteProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProjects"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProjects"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteProjectsMutation, DeleteProjectsMutationVariables>;
export const AddProjectMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddProjectMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addProjectMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<AddProjectMembersMutation, AddProjectMembersMutationVariables>;
export const RemoveProjectMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveProjectMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memberIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeProjectMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"memberIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memberIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<RemoveProjectMembersMutation, RemoveProjectMembersMutationVariables>;
export const GetProjectMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProjectMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetProjectMembersQuery, GetProjectMembersQueryVariables>;
export const GetProjectTeamsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetProjectTeams"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"project"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teams"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetProjectTeamsQuery, GetProjectTeamsQueryVariables>;
export const GetTeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTeamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"after"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"teamMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"after"},"value":{"kind":"Variable","name":{"kind":"Name","value":"after"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}}]}}]} as unknown as DocumentNode<GetTeamMembersQuery, GetTeamMembersQueryVariables>;
export const CreateTeamDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateTeam"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createTeam"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"team"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]}}]} as unknown as DocumentNode<CreateTeamMutation, CreateTeamMutationVariables>;
export const DeleteTeamsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteTeams"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteTeams"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteTeamsMutation, DeleteTeamsMutationVariables>;
export const AddTeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddTeamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addTeamMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<AddTeamMembersMutation, AddTeamMembersMutationVariables>;
export const RemoveTeamMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveTeamMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeTeamMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"userIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<RemoveTeamMembersMutation, RemoveTeamMembersMutationVariables>;