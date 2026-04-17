import { useEffect, useMemo, useState } from 'react';
import { AuthScreen, Modal } from './components/AuthScreen';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TaskTrailView } from './components/TaskTrailView';
import { WorkspaceChrome } from './components/WorkspaceChrome';
import { useRouteState } from './hooks/useRouteState';
import { useSession } from './hooks/useSession';
import { useTaskPages } from './hooks/useTaskPages';
import { gql } from './lib/api';
import {
  CREATE_PROJECT,
  CREATE_TASK,
  CREATE_TASK_LINK,
  CREATE_TEAM,
  GET_PROJECTS,
  GET_TASK,
  GET_TASK_NETWORK,
  GET_TEAMS,
  UPDATE_TASKS,
} from './lib/graphql';
import type { Project, Task, TaskNetwork, Team } from './types';

export function App() {
  const { token, user, login, logout } = useSession();
  const { route, navigate } = useRouteState();

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [focusedTask, setFocusedTask] = useState<Task | null>(null);
  const [network, setNetwork] = useState<TaskNetwork | null>(null);
  const [error] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { tasks, taskMap, hasPrevious, hasNext, loading, loadedTaskCount, loadedPageCount } = useTaskPages(
    route.projectId,
    token,
    route.page,
    refreshKey,
  );
  const firstTaskId = tasks[0]?.id ?? null;

  useEffect(() => {
    if (!token) return;
    void loadProjects();
  }, [token]);

  useEffect(() => {
    if (!route.projectId || !token) return;
    void loadTeams(route.projectId);
  }, [route.projectId, token]);

  useEffect(() => {
    if (!projects.length || route.projectId) return;
    navigate({ projectId: projects[0].id, taskId: null, page: 0, view: 'trail' }, true);
  }, [projects, route.projectId]);

  useEffect(() => {
    if (!route.projectId || !token) return;
    const taskId = route.taskId ?? firstTaskId;
    if (!taskId) return;
    if (!route.taskId) {
      navigate({ ...route, taskId, projectId: route.projectId }, true);
      return;
    }
    void loadFocused(route.projectId, taskId);
    void loadNetwork(route.projectId, taskId);
  }, [route.projectId, route.taskId, token, firstTaskId]);

  async function loadProjects() {
    if (!token) return;
    const data = await gql<{ projects: { edges: Array<{ node: Project }> } }>(GET_PROJECTS, { first: 50 }, token);
    setProjects(data.projects.edges.map((edge) => edge.node));
  }

  async function loadTeams(projectId: string) {
    if (!token) return;
    const data = await gql<{ teams: { edges: Array<{ node: Team }> } }>(GET_TEAMS, { projectId, first: 50 }, token);
    setTeams(data.teams.edges.map((edge) => edge.node));
  }

  async function loadFocused(projectId: string, taskId: string) {
    if (!token) return;
    const local = taskMap.get(taskId);
    if (local) setFocusedTask(local);
    const data = await gql<{ task: Task | null }>(GET_TASK, { projectId, id: taskId }, token);
    setFocusedTask(data.task);
  }

  async function loadNetwork(projectId: string, taskId: string) {
    if (!token) return;
    const data = await gql<{ taskNetwork: TaskNetwork }>(
      GET_TASK_NETWORK,
      { projectId, taskId, depth: 3, limit: 20 },
      token,
    );
    setNetwork(data.taskNetwork);
  }

  async function createProject(formData: FormData) {
    if (!token) return;
    setBusy(true);
    try {
      const name = String(formData.get('name') ?? '').trim();
      const description = String(formData.get('description') ?? '').trim();
      const data = await gql<{ createProject: Project }>(CREATE_PROJECT, { name, description: description || null }, token);
      await loadProjects();
      setRefreshKey((value) => value + 1);
      navigate({ projectId: data.createProject.id, taskId: null, page: 0, view: 'trail' });
      setProjectModalOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function createTeam(formData: FormData) {
    if (!token || !route.projectId) return;
    setBusy(true);
    try {
      const name = String(formData.get('name') ?? '').trim();
      await gql(CREATE_TEAM, { projectId: route.projectId, name }, token);
      await loadTeams(route.projectId);
      setRefreshKey((value) => value + 1);
      setTeamModalOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function createTask(formData: FormData) {
    if (!token || !route.projectId) return;
    setBusy(true);
    try {
      const title = String(formData.get('title') ?? '').trim();
      const description = String(formData.get('description') ?? '').trim();
      const teamId = String(formData.get('teamId') ?? '').trim();
      await gql(CREATE_TASK, { projectId: route.projectId, title, description, teamId: teamId || null }, token);
      setTaskModalOpen(false);
      setRefreshKey((value) => value + 1);
      navigate({ ...route, page: 0 }, true);
    } finally {
      setBusy(false);
    }
  }

  async function createLink(formData: FormData) {
    if (!token || !route.projectId || !focusedTask) return;
    setBusy(true);
    try {
      const targetTaskId = String(formData.get('targetTaskId') ?? '').trim();
      const label = String(formData.get('label') ?? '').trim();
      await gql(CREATE_TASK_LINK, {
        projectId: route.projectId,
        sourceTaskId: focusedTask.id,
        targetTaskId,
        label,
      }, token);
      await loadNetwork(route.projectId, focusedTask.id);
      setRefreshKey((value) => value + 1);
      setLinkModalOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(status: string) {
    if (!token || !route.projectId || !focusedTask) return;
    await gql(UPDATE_TASKS, {
      projectId: route.projectId,
      tasks: [{ id: focusedTask.id, version: focusedTask.version, status }],
    }, token);
    setRefreshKey((value) => value + 1);
    await loadFocused(route.projectId, focusedTask.id);
    await loadNetwork(route.projectId, focusedTask.id);
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === route.projectId) ?? null,
    [projects, route.projectId],
  );

  if (!token || !user) return <AuthScreen onLogin={login} />;

  return (
    <>
      <WorkspaceChrome
        sidebar={
          <ProjectSidebar
            username={user.username}
            projects={projects}
            teams={teams}
            selectedProjectId={route.projectId}
            onSelectProject={(projectId) => navigate({ projectId, taskId: null, page: 0, view: 'trail' })}
            onCreateProject={() => setProjectModalOpen(true)}
            onCreateTeam={() => setTeamModalOpen(true)}
            onLogout={logout}
          />
        }
      >
        {error ? <div className="error-banner">{error}</div> : null}
        <TaskTrailView
          project={selectedProject}
          tasks={tasks}
          focusedTask={focusedTask}
          network={network}
          loadingTasks={loading}
          loadedTaskCount={loadedTaskCount}
          loadedPageCount={loadedPageCount}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
          onPage={(direction) => navigate({ ...route, page: Math.max(0, route.page + direction) })}
          onOpenTask={(taskId) => route.projectId && navigate({ projectId: route.projectId, taskId, page: route.page, view: 'trail' })}
          onOpenCreateTask={() => setTaskModalOpen(true)}
          onOpenCreateLink={() => setLinkModalOpen(true)}
          onOpenCreateTeam={() => setTeamModalOpen(true)}
          onStatusChange={updateStatus}
          teams={teams}
        />
      </WorkspaceChrome>

      <Modal title="New project" open={projectModalOpen} onClose={() => setProjectModalOpen(false)}>
        <EntityForm
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'description', label: 'Description', multiline: true },
          ]}
          busy={busy}
          onSubmit={createProject}
        />
      </Modal>

      <Modal title="New team" open={teamModalOpen} onClose={() => setTeamModalOpen(false)}>
        <EntityForm
          fields={[{ name: 'name', label: 'Team name', required: true }]}
          busy={busy}
          onSubmit={createTeam}
        />
      </Modal>

      <Modal title="New task" open={taskModalOpen} onClose={() => setTaskModalOpen(false)}>
        <EntityForm
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'description', label: 'Description', multiline: true, required: true },
            { name: 'teamId', label: 'Team id', placeholder: teams[0]?.id ?? 'optional' },
          ]}
          busy={busy}
          onSubmit={createTask}
        />
      </Modal>

      <Modal title="New link" open={linkModalOpen} onClose={() => setLinkModalOpen(false)}>
        <EntityForm
          fields={[
            { name: 'targetTaskId', label: 'Target task id', required: true, placeholder: tasks.find((task) => task.id !== focusedTask?.id)?.id ?? '' },
            { name: 'label', label: 'Label', required: true, placeholder: 'blocks' },
          ]}
          busy={busy}
          onSubmit={createLink}
        />
      </Modal>
    </>
  );
}

function EntityForm({
  fields,
  busy,
  onSubmit,
}: {
  fields: Array<{ name: string; label: string; required?: boolean; multiline?: boolean; placeholder?: string }>;
  busy: boolean;
  onSubmit: (data: FormData) => Promise<void>;
}) {
  return (
    <form
      className="entity-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
    >
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          {field.multiline ? (
            <textarea name={field.name} required={field.required} placeholder={field.placeholder} />
          ) : (
            <input name={field.name} required={field.required} placeholder={field.placeholder} />
          )}
        </label>
      ))}
      <button className="submit-button" type="submit" disabled={busy}>{busy ? 'Saving' : 'Save'}</button>
    </form>
  );
}
