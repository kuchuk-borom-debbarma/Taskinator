import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Modal } from './Modal';
import { Drawer } from './Drawer';
import { MemberManager } from './MemberManager';
import { Trash2 } from 'lucide-react';
import { useUIStore } from '../store/ui';
import { gqlClient } from '../graphql/client';
import { 
  CREATE_PROJECT, 
  CREATE_TASK, 
  CREATE_TEAM,
  GET_PROJECT
} from '../graphql/operations';

export const GlobalModals: React.FC = () => {
  const { activeModal, closeModal } = useUIStore();
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Local state for forms
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [teamName, setTeamName] = useState('');

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => gqlClient.request<any>(CREATE_PROJECT, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      closeModal();
      if (data?.createProject?.id) {
        navigate({ to: '/project/$projectId/tasks', params: { projectId: data.createProject.id } });
      }
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      gqlClient.request<any>(CREATE_TASK, {
        projectId: projectId!,
        title: data.title,
        description: data.description || '',
      }),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['tasks', projectId] });
        qc.invalidateQueries({ queryKey: ['rootTasks', projectId] });
        closeModal();
        setTaskTitle('');
        setTaskDescription('');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (name: string) => gqlClient.request<any>(CREATE_TEAM, { projectId: projectId!, name }),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['teams', projectId] });
        closeModal();
        setTeamName('');
    },
  });

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => gqlClient.request<any>(GET_PROJECT, { id: projectId }),
    enabled: !!projectId && activeModal === 'PROJECT_SETTINGS',
  });

  return (
    <>
      {/* Create Project Modal */}
      <Modal
        isOpen={activeModal === 'CREATE_PROJECT'}
        onClose={closeModal}
        title="Create Project"
        footer={
           <button 
            disabled={!projectName.trim() || createProjectMutation.isPending}
            onClick={() => createProjectMutation.mutate({ name: projectName, description: projectDescription })}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold"
           >
             {createProjectMutation.isPending ? 'Forging...' : 'Create'}
           </button>
        }
      >
         <div className="space-y-4">
           <input placeholder="Project name..." value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm" />
           <textarea placeholder="Description..." value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm min-h-[100px]" />
         </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={activeModal === 'CREATE_TASK'}
        onClose={closeModal}
        title="Create New Task"
        footer={
           <button 
            disabled={!taskTitle.trim() || createTaskMutation.isPending}
            onClick={() => createTaskMutation.mutate({ title: taskTitle, description: taskDescription })}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold"
           >
             {createTaskMutation.isPending ? 'Forging...' : 'Create Task'}
           </button>
        }
      >
         <div className="space-y-4">
           <input placeholder="Task title..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm" />
           <textarea placeholder="Instructional details..." value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm min-h-[100px]" />
         </div>
      </Modal>

      {/* Create Team Modal */}
      <Modal
        isOpen={activeModal === 'CREATE_TEAM'}
        onClose={closeModal}
        title="Forge New Team"
        footer={
           <button 
            disabled={!teamName.trim() || createTeamMutation.isPending}
            onClick={() => createTeamMutation.mutate(teamName)}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold"
           >
             {createTeamMutation.isPending ? 'Forging...' : 'Forge Team'}
           </button>
        }
      >
         <div className="space-y-4">
           <p className="text-[11px] text-muted-foreground/60 px-1">Teams allow you to group strategists and scale your orchestration efforts.</p>
           <input placeholder="Team name..." value={teamName} onChange={(e) => setTeamName(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm" />
         </div>
      </Modal>

      {/* Project Settings Drawer */}
      <Drawer
        isOpen={activeModal === 'PROJECT_SETTINGS'}
        onClose={closeModal}
        title="Project Settings"
      >
         {projectData?.project && (
           <div className="space-y-10">
              <div className="p-5 glass rounded-2xl space-y-4">
                 <input 
                   type="text"
                   defaultValue={projectData.project.name}
                   className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-primary/40"
                 />
                 <textarea 
                   defaultValue={projectData.project.description || ''}
                   className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[12px] min-h-[80px] outline-none"
                 />
              </div>

              <MemberManager 
                 projectId={projectId!}
                 onAdd={() => {}}
                 onRemove={() => {}}
              />

              <button 
                onClick={() => { /* delete proj */ }}
                className="w-full py-3 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all text-[13px] font-bold"
              >
                 <Trash2 size={16} className="inline mr-2" /> Delete Project
              </button>
           </div>
         )}
      </Drawer>
    </>
  );
};
