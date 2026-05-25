import React, { useState } from 'react';
import { Outlet, Link, useParams, useLocation, useNavigate } from '@tanstack/react-router';
import { Layout, Users, Kanban, Loader2, PencilLine, Save, Trash2, Zap } from 'lucide-react';
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
    { label: 'Automations', icon: Zap, to: '/projects/$projectId/automations' as const },
  ];

  return (
    <div className="flex min-h-screen flex-col animate-fade-in">
      {/* Premium Top Navigation Glass Header */}
      <div className="border-b border-slate-200/60 bg-white/60 px-4 py-6 backdrop-blur-xl md:px-8 shrink-0">
        <div className="page-frame !max-w-none !px-0 !py-0 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            {project ? (
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-app-ink">{project.name}</h1>
                {project.description ? (
                  <p className="max-w-3xl text-xs leading-relaxed text-app-muted line-clamp-1">{project.description}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No description added.</p>
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-3.5">
                <div className="h-7 w-48 rounded-lg bg-slate-100" />
                <div className="h-4 w-96 rounded-md bg-slate-100/70" />
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-3.5 py-2 text-xs font-bold text-app-ink hover:bg-slate-50 transition duration-300 cursor-pointer shadow-sm"
                >
                  <PencilLine size={13} className="text-app-accent" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this project and all related project data?')) deleteProject.mutate();
                  }}
                  disabled={deleteProject.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3.5 py-2 text-xs font-bold text-red-600 transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
                >
                  {deleteProject.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          {/* Sub Navigation Pill Bar */}
          <div className="flex flex-wrap gap-1.5 pt-1">
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
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition duration-300 cursor-pointer ${
                    active
                      ? 'bg-app-ink text-white shadow-sm'
                      : 'border border-slate-200 bg-white/60 text-app-muted hover:border-slate-300 hover:text-app-ink'
                  }`}
                >
                  <item.icon size={13} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Outlet Container */}
      <div className="flex-1 bg-slate-50/15">
        <Outlet />
      </div>

      {/* Edit Project Dialog */}
      <AppModal open={isEditing} title="Edit project scope" description="Update project metadata using optimistic locking." onClose={() => setIsEditing(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (nameDraft.trim()) updateProject.mutate();
          }}
        >
          <TextField label="Project Name" value={nameDraft} onChange={setNameDraft} required />
          <TextAreaField label="Description / Context" value={descriptionDraft} onChange={setDescriptionDraft} rows={4} />
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/50">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-app-ink transition duration-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProject.isPending || !nameDraft.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-app-accent hover:bg-app-accent/90 px-4 py-2.5 text-xs font-bold text-white transition duration-300 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {updateProject.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save project
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};
