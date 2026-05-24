import React, { useState } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from '@tanstack/react-router';
import { Layout, Users, Kanban, Loader2, PencilLine, Save, Trash2, X, Zap } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { AppModal, TextAreaField, TextField } from '../shared/workspace';

export const ProjectLayout: React.FC = () => {
  const { projectId } = useParams({ from: '/authenticated-layout/projects/$projectId' });
  const location = useLocation();
  const navigate = useNavigate();
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectApi.getProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 30,
  });

  const updateProject = useMutation({
    mutationFn: () => {
      if (!project) throw new Error('Project not loaded');
      return projectApi.updateProject(
        project.id,
        project.version,
        nameDraft.trim(),
        descriptionDraft.trim() || undefined
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', projectId], updated);
      queryClient.invalidateQueries({ queryKey: ['workspace-projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-dashboard', projectId] });
      setIsEditing(false);
    },
  });

  const deleteProject = useMutation({
    mutationFn: () => projectApi.deleteProjects([projectId]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      navigate({ to: '/' });
    },
  });

  const navItems = [
    { label: 'Dashboard', icon: Layout, to: '/projects/$projectId' as const },
    { label: 'Tasks', icon: Kanban, to: '/projects/$projectId/tasks' as const },
    { label: 'Teams', icon: Users, to: '/projects/$projectId/teams' as const },
    { label: 'Members', icon: Users, to: '/projects/$projectId/members' as const },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-app-line/80 bg-white/45 px-4 py-6 backdrop-blur-xl md:px-8">
        <div className="page-frame !max-w-none !px-0 !py-0">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {project ? (
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-app-ink">{project.name}</h1>
                {project.description ? (
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-app-muted line-clamp-1">{project.description}</p>
                ) : null}
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-8 w-48 rounded-lg bg-app-line/50" />
                <div className="h-4 w-96 rounded-md bg-app-line/30" />
              </div>
            )}
            {project ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setNameDraft(project.name);
                    setDescriptionDraft(project.description || '');
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-4 py-2 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
                >
                  <PencilLine size={15} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this project and all related project data?')) deleteProject.mutate();
                  }}
                  disabled={deleteProject.isPending}
                  className="inline-flex items-center gap-2 rounded-full border border-app-danger/20 bg-app-danger/10 px-4 py-2 text-sm font-semibold text-app-danger transition hover:bg-app-danger/15 disabled:opacity-60"
                >
                  {deleteProject.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Delete
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const active =
                item.label === 'Dashboard'
                  ? location.pathname === `/projects/${projectId}` || location.pathname === `/projects/${projectId}/`
                  : location.pathname.startsWith(item.to.replace('$projectId', projectId));

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  params={{ projectId }}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-app-ink text-white'
                      : 'border border-app-line bg-white/75 text-app-ink hover:border-app-ink/20'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1">
        <Outlet />
      </div>

      <AppModal open={isEditing} title="Edit project" description="Update project metadata using optimistic locking." onClose={() => setIsEditing(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (nameDraft.trim()) updateProject.mutate();
          }}
        >
          <TextField label="Project name" value={nameDraft} onChange={setNameDraft} required />
          <TextAreaField label="Description" value={descriptionDraft} onChange={setDescriptionDraft} rows={4} />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-2 rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProject.isPending || !nameDraft.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:opacity-60"
            >
              {updateProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save project
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};
