import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { AppModal, TextAreaField, TextField } from '../shared/workspace';
import { useLayout } from '../../context/LayoutContext';

export const CreateProjectModal: React.FC = () => {
  const { isCreateProjectModalOpen, setCreateProjectModalOpen } = useLayout();
  const { projectApi } = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createProject = useMutation({
    mutationFn: () => projectApi.createProject(name.trim(), description.trim() || undefined),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-projects-list'] });
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      setCreateProjectModalOpen(false);
      setName('');
      setDescription('');
      navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
    },
  });

  if (!isCreateProjectModalOpen) return null;

  return (
    <AppModal
      open
      title="Create a new project"
      description="Start with a lightweight brief. You can shape tasks and teams after the project exists."
      onClose={() => setCreateProjectModalOpen(false)}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          createProject.mutate();
        }}
      >
        <TextField
          label="Project name"
          value={name}
          onChange={setName}
          placeholder="Q3 launch prep"
          required
        />
        <TextAreaField
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="What this project is for, who it serves, and how success will look."
        />
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => setCreateProjectModalOpen(false)}
            className="rounded-full border border-app-line bg-white/80 px-5 py-3 text-sm font-semibold text-app-ink transition hover:border-app-ink/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createProject.isPending || !name.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-app-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
            Create project
          </button>
        </div>
      </form>
    </AppModal>
  );
};
