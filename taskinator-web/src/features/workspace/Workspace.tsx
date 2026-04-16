import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Trash2,
} from 'lucide-react';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout';
import { ProjectDashboard } from './ProjectDashboard';
import { TeamGrid } from '../../components/TeamGrid';
import { TaskListView } from '../../components/TaskListView';
import { TaskDetailView } from '../../components/TaskDetailView';
import { Header } from '../../components/Header';
import { NotificationPanel } from '../../components/NotificationPanel';
import { Drawer } from '../../components/Drawer';
import { Modal } from '../../components/Modal';
import { MemberManager } from '../../components/MemberManager';
import { AnimatePresence } from 'framer-motion';
import { useRealtime } from '../../hooks/useRealtime.ts';
import type { JWTPayload } from '../../types';
import { gqlClient } from '../../graphql/client';
import {
  GET_PROJECT, GET_UNREAD_NOTIFICATIONS_COUNT,
  CREATE_PROJECT, UPDATE_TASKS,
  CREATE_TASK, CREATE_TEAM
} from '../../graphql/operations';
import { cn } from '../../utils/cn';

interface WorkspaceProps {
  user: JWTPayload;
  onLogout: () => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ user, onLogout }) => {
  const userId = user.id;
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  useRealtime(userId, selectedProjectId);
  
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'teams'>('tasks');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const qc = useQueryClient();

  // Queries
  const { data: selectedProjectData } = useQuery({
    queryKey: ['project', selectedProjectId],
    queryFn: () => gqlClient.request<any>(GET_PROJECT, { id: selectedProjectId }),
    enabled: !!selectedProjectId,
  });
  const selectedProject = selectedProjectData?.project;

  // Initialization logic removed as we now use TaskListView's internal pagination

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: () => gqlClient.request<any>(GET_UNREAD_NOTIFICATIONS_COUNT),
  });
  const unreadCount = unreadData?.unreadNotificationsCount ?? 0;

  const invalidateWorkspace = () => {
    qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId] });
    qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
    qc.invalidateQueries({ queryKey: ['rootTasks', selectedProjectId] });
    qc.invalidateQueries({ queryKey: ['teams', selectedProjectId] });
  };

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { id: string; version: number; status?: string; title?: string; description?: string; teamId?: string | null; memberId?: string | null }) =>
      gqlClient.request<any>(UPDATE_TASKS, { projectId: selectedProjectId!, tasks: [updates] }),
    onSuccess: () => invalidateWorkspace(),
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => gqlClient.request<any>(CREATE_PROJECT, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (data?.createProject?.id) setSelectedProjectId(data.createProject.id);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      gqlClient.request<any>(CREATE_TASK, {
        projectId: selectedProjectId!,
        title: data.title,
        description: data.description || '',
      }),
    onSuccess: () => {
        invalidateWorkspace();
        setIsCreateTaskOpen(false);
        setTaskTitle('');
        setTaskDescription('');
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (name: string) => gqlClient.request<any>(CREATE_TEAM, { projectId: selectedProjectId!, name }),
    onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['teams', selectedProjectId] });
        setIsCreateTeamOpen(false);
        setTeamName('');
    },
  });

  return (
    <WorkspaceLayout
      isFocused={!!selectedProjectId}
      sidebar={
        <ProjectSidebar
          userId={userId}
          username={user.username}
          onLogout={onLogout}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectOpen(true)}
        />
      }
      header={
        <Header 
          projectName={selectedProject?.name}
          onOpenNotifications={() => setIsNotifPanelOpen(!isNotifPanelOpen)}
          onOpenSettings={() => setIsProjectSettingsOpen(true)}
          unreadCount={unreadCount}
        >
          <NotificationPanel 
            isOpen={isNotifPanelOpen}
            onClose={() => setIsNotifPanelOpen(false)}
            userId={userId}
          />
        </Header>
      }
    >
      {selectedProjectId ? (
        <div className="h-full flex flex-col min-h-0 relative">
          {/* Focused View Hero */}
          <div className="px-10 py-10 flex items-center justify-between shrink-0">
            <div className="space-y-4">
              <h2 className="text-3xl font-black tracking-tight text-foreground/90">{selectedProject?.name}</h2>
              <div className="flex items-center gap-6">
                 <button 
                    onClick={() => setActiveTab('tasks')}
                    className={cn("text-xs font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all", activeTab === 'tasks' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white/80")}
                 >
                    Tasks
                 </button>
                 <button 
                    onClick={() => setActiveTab('teams')}
                    className={cn("text-xs font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all flex items-center gap-2", activeTab === 'teams' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-white/80")}
                 >
                    Teams
                 </button>
              </div>
            </div>
            
            <button
               onClick={() => activeTab === 'tasks' ? setIsCreateTaskOpen(true) : setIsCreateTeamOpen(true)}
               className="bg-primary hover:bg-indigo-500 text-white text-[13px] font-black px-8 py-3 rounded-full transition-all shadow-[0_10px_40px_rgb(99,102,241,0.3)] hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={20} strokeWidth={3} />
              {activeTab === 'tasks' ? 'Create Task' : 'Create Team'}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative">
             {activeTab === 'tasks' && (
               <TaskListView 
                 projectId={selectedProjectId}
                 onFocusTask={setActiveTaskId}
                 onOpenDetails={setActiveTaskId}
               />
             )}

             {activeTab === 'teams' && (
               <TeamGrid 
                 projectId={selectedProjectId}
                 selectedTeamId={selectedTeamId}
                 onSelectTeam={setSelectedTeamId}
                 onCreateTeam={() => setIsCreateTeamOpen(true)}
               />
             )}
          </div>

          <AnimatePresence>
            {activeTaskId && (
                <TaskDetailView 
                    taskId={activeTaskId}
                    projectId={selectedProjectId}
                    onClose={() => setActiveTaskId(null)}
                    onJumpToTask={setActiveTaskId}
                />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <ProjectDashboard 
          userId={userId}
          username={user.username}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectOpen(true)}
        />
      )}

      {/* Settings Drawer */}
      <Drawer
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        title="Project Settings"
      >
         {selectedProject && (
           <div className="space-y-10">
              <div className="p-5 glass rounded-2xl space-y-4">
                 <input 
                   type="text"
                   defaultValue={selectedProject.name}
                   className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-primary/40"
                 />
                 <textarea 
                   defaultValue={selectedProject.description || ''}
                   className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[12px] min-h-[80px] outline-none"
                 />
              </div>

              <MemberManager 
                 projectId={selectedProjectId!}
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

      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
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

      <Modal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
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

      <Modal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        title="Create Project"
        footer={
           <button 
            disabled={!projectName.trim()}
            onClick={() => {
              createProjectMutation.mutate({ name: projectName, description: projectDescription });
              setIsCreateProjectOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold"
           >
             Create
           </button>
        }
      >
         <div className="space-y-4">
           <input placeholder="Project name..." value={projectName} onChange={(e) => setProjectName(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm" />
           <textarea placeholder="Description..." value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="w-full glass rounded-2xl p-4 outline-none text-sm min-h-[100px]" />
         </div>
      </Modal>

      {/* Remaining Team/Task details modals/drawers would move to their respective sub-components or stay here but use identifiers */}
    </WorkspaceLayout>
  );
};
