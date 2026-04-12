import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  FolderEdit, 
  Trash2, 
  Users2, 
  AlertTriangle,
  Zap,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { TaskDrillView } from '../../components/TaskDrillView';
import { Drawer } from '../../components/Drawer';
import { MemberManager } from '../../components/MemberManager';
import { Modal } from '../../components/Modal';
import { Header } from '../../components/Header';
import { NotificationPanel } from '../../components/NotificationPanel';
import { UserSearchDropdown } from '../../components/UserSearchDropdown';
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout';
import { ProjectDashboard } from './ProjectDashboard';
import { useRealtime } from '../../hooks/useRealtime.ts';
import type { JWTPayload, TaskTriggerType, TaskTrigger } from '../../types';
import { gqlClient } from '../../graphql/client';
import {
  GET_PROJECTS, GET_WORKSPACE_DATA, GET_PROJECT_MEMBERS, GET_TEAM_MEMBERS, GET_UNREAD_NOTIFICATIONS_COUNT,
  CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECTS, CREATE_TEAM, DELETE_TEAMS, ADD_PROJECT_MEMBERS, REMOVE_PROJECT_MEMBERS, ADD_TEAM_MEMBERS, REMOVE_TEAM_MEMBERS,
  CREATE_TASK, UPDATE_TASKS, DELETE_TASKS, ADD_TASK_TRIGGER, DELETE_TASK_TRIGGER, UPDATE_TASK_TRIGGER
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'teams'>('tasks');
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [parentTaskIdForNew, setParentTaskIdForNew] = useState<string>();

  const [isCreateTriggerOpen, setIsCreateTriggerOpen] = useState(false);
  const [editTriggerId, setEditTriggerId] = useState<string | null>(null);
  const [triggerForm, setTriggerForm] = useState<{ name: string; type: TaskTriggerType; data: any }>({
    name: '',
    type: 'BLOCK_PARENT_DONE',
    data: { revertStatusTo: 'IN_PROGRESS' }
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const qc = useQueryClient();

  // Queries
  const { data: projectData } = useQuery({
    queryKey: ['projects', userId],
    queryFn: () => gqlClient.request<any>(GET_PROJECTS, { first: 50 }),
    enabled: !!userId,
  });
  const projects = (projectData?.projects?.edges ?? []).map((e: any) => e.node);

  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', selectedProjectId, userId],
    queryFn: () => gqlClient.request<any>(GET_WORKSPACE_DATA, { projectId: selectedProjectId, first: 200 }),
    enabled: !!selectedProjectId,
  });
  const projectTasks = (workspaceData?.tasks?.edges ?? []).map((e: any) => e.node);
  const teams = (workspaceData?.teams?.edges ?? []).map((e: any) => e.node);

  const triggerMap = useMemo(() => {
    const map: Record<string, TaskTrigger[]> = {};
    projectTasks.forEach((t: any) => {
      map[t.id] = t.triggers ?? [];
    });
    return map;
  }, [projectTasks]);

  const { data: memberData } = useQuery({
    queryKey: ['project-members', selectedProjectId, userId],
    queryFn: () => gqlClient.request<any>(GET_PROJECT_MEMBERS, { projectId: selectedProjectId, first: 50 }),
    enabled: isProjectSettingsOpen && !!selectedProjectId,
  });
  const projectMembers = (memberData?.projectMembers?.edges ?? []).map((e: any) => e.node);

  const { data: tMemData } = useQuery({
    queryKey: ['team-members', selectedProjectId, selectedTeamId],
    queryFn: () => gqlClient.request<any>(GET_TEAM_MEMBERS, { projectId: selectedProjectId, teamId: selectedTeamId, first: 50 }),
    enabled: !!selectedTeamId && !!selectedProjectId,
  });
  const teamMembers = (tMemData?.teamMembers?.edges ?? []).map((e: any) => e.node);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: () => gqlClient.request<any>(GET_UNREAD_NOTIFICATIONS_COUNT),
  });
  const unreadCount = unreadData?.unreadNotificationsCount ?? 0;

  // Mutations
  const addTaskTriggerMutation = useMutation({
    mutationFn: (data: { name: string; triggerType: TaskTriggerType; triggerData: any }) =>
      gqlClient.request<any>(ADD_TASK_TRIGGER, {
        taskId: selectedTaskId!,
        projectId: selectedProjectId!,
        name: data.name,
        triggerType: data.triggerType,
        triggerData: JSON.stringify(data.triggerData)
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const updateTaskTriggerMutation = useMutation({
    mutationFn: (data: { triggerId: string; name?: string; triggerType?: TaskTriggerType; triggerData?: any }) =>
      gqlClient.request<any>(UPDATE_TASK_TRIGGER, {
        triggerId: data.triggerId,
        name: data.name,
        triggerType: data.triggerType,
        triggerData: data.triggerData ? JSON.stringify(data.triggerData) : undefined
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const deleteTaskTriggerMutation = useMutation({
    mutationFn: (triggerId: string) => gqlClient.request<any>(DELETE_TASK_TRIGGER, { taskId: selectedTaskId!, triggerId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; parentTaskId?: string }) =>
      gqlClient.request<any>(CREATE_TASK, {
        projectId: selectedProjectId!,
        title: data.title,
        description: '',
        parentTaskId: data.parentTaskId,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: (updates: { id: string; version: number; status?: string; title?: string; description?: string; teamId?: string | null; memberId?: string | null }) =>
      gqlClient.request<any>(UPDATE_TASKS, { projectId: selectedProjectId!, tasks: [updates] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const deleteTasksMutation = useMutation({
    mutationFn: (taskIds: string[]) => gqlClient.request<any>(DELETE_TASKS, { projectId: selectedProjectId!, taskIds }),
    onSuccess: () => {
      setSelectedTaskId(null);
      qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; description?: string }) => 
      gqlClient.request<any>(UPDATE_PROJECT, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', userId] }),
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      console.log("[Workspace] Sending CreateProject mutation for:", data.name);
      try {
        const res = await gqlClient.request<any>(CREATE_PROJECT, data);
        console.log("[Workspace] CreateProject Success response:", res);
        return res;
      } catch (err) {
        console.error("[Workspace] CreateProject Network Error:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects', userId] });
      if (data?.createProject?.id) setSelectedProjectId(data.createProject.id);
    },
    onError: (err) => {
      console.error("[Workspace] CreateProject Mutation Error:", err);
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request<any>(DELETE_PROJECTS, { projectIds: [id] }),
    onSuccess: () => {
      setSelectedProjectId(undefined);
      setIsProjectSettingsOpen(false);
      qc.invalidateQueries({ queryKey: ['projects', userId] });
    },
  });

  const addProjectMemberMutation = useMutation({
    mutationFn: (targetUserId: string) => gqlClient.request<any>(ADD_PROJECT_MEMBERS, {
      projectId: selectedProjectId!,
      userIds: [targetUserId]
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', selectedProjectId, userId] }),
  });

  const removeProjectMemberMutation = useMutation({
    mutationFn: (memberId: string) => gqlClient.request<any>(REMOVE_PROJECT_MEMBERS, {
      projectId: selectedProjectId!,
      memberIds: [memberId]
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', selectedProjectId, userId] }),
  });

  const createTeamMutation = useMutation({
    mutationFn: (name: string) => gqlClient.request<any>(CREATE_TEAM, { projectId: selectedProjectId!, name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request<any>(DELETE_TEAMS, { projectId: selectedProjectId!, teamIds: [id] }),
    onSuccess: () => {
      setSelectedTeamId(null);
      qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] });
    },
  });

  const addTeamMemberMutation = useMutation({
    mutationFn: (targetUserId: string) => gqlClient.request<any>(ADD_TEAM_MEMBERS, {
      projectId: selectedProjectId!,
      teamId: selectedTeamId!,
      userIds: [targetUserId]
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', selectedProjectId, selectedTeamId] }),
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: (memberId: string) => {
      const member = teamMembers.find((m: any) => m.id === memberId);
      return gqlClient.request<any>(REMOVE_TEAM_MEMBERS, {
        projectId: selectedProjectId!,
        teamId: selectedTeamId!,
        userIds: [member!.userId]
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', selectedProjectId, selectedTeamId] }),
  });

  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);
  const selectedTask = projectTasks.find((t: any) => t.id === selectedTaskId);

  const taskTriggers: TaskTrigger[] = selectedTaskId ? (triggerMap[selectedTaskId] ?? []) : [];

  return (
    <WorkspaceLayout
      isFocused={!!selectedProjectId}
      sidebar={
        <ProjectSidebar
          projects={projects}
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
      sidePanel={undefined}
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
                    <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[9px] font-black">{teams.length}</span>
                 </button>
              </div>
            </div>
            
            {activeTab === 'tasks' && (
              <button
                onClick={() => {
                  setTaskTitle('');
                  setParentTaskIdForNew(focusedTaskId || undefined);
                  setIsCreateTaskOpen(true);
                }}
                className="bg-primary hover:bg-indigo-500 text-white text-[13px] font-black px-8 py-3 rounded-full transition-all shadow-[0_10px_40px_rgb(99,102,241,0.3)] hover:-translate-y-1 active:scale-95 flex items-center gap-3"
              >
                <Plus size={20} strokeWidth={3} />
                Create Task
              </button>
            )}
            {activeTab === 'teams' && (
              <button
                onClick={() => setIsCreateTeamOpen(true)}
                className="bg-primary hover:bg-indigo-500 text-white text-[13px] font-black px-8 py-3 rounded-full transition-all shadow-[0_10px_40px_rgb(99,102,241,0.3)] hover:-translate-y-1 active:scale-95 flex items-center gap-3"
              >
                <Plus size={20} strokeWidth={3} />
                Create Team
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden relative">
             {activeTab === 'tasks' && (
               <TaskDrillView 
                 tasks={projectTasks}
                 focusedTaskId={focusedTaskId}
                 onFocusTask={setFocusedTaskId}
                 onOpenDetails={setSelectedTaskId}
                 onToggleStatus={(task) => updateTaskMutation.mutate({ id: task.id, version: task.version, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                 onCreateSubtask={(pid) => {
                   setTaskTitle('');
                   setParentTaskIdForNew(pid);
                   setIsCreateTaskOpen(true);
                 }}
               />
             )}

             {activeTab === 'teams' && (
               <div className="px-10 h-full overflow-y-auto custom-scrollbar pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                  {teams.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl">
                       <Users2 size={32} className="text-muted-foreground/30 mb-4" />
                       <p className="text-sm font-bold text-muted-foreground">No teams forged yet.</p>
                       <button 
                         onClick={() => setIsCreateTeamOpen(true)}
                         className="mt-6 flex items-center gap-2 text-[12px] font-bold text-primary hover:text-indigo-400 bg-primary/10 px-4 py-2 rounded-lg transition-all"
                       >
                          <Plus size={14} /> Forge First Team
                       </button>
                    </div>
                  ) : teams.map((team: any) => (
                    <button 
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      className={cn(
                        "text-left p-6 rounded-3xl border transition-all duration-300 group hover:-translate-y-1",
                        selectedTeamId === team.id 
                          ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20" 
                          : "glass border-white/5 hover:border-white/10"
                      )}
                    >
                      <h3 className="text-lg font-black text-foreground/90 mb-4 group-hover:text-primary transition-colors">{team.name}</h3>
                      <div className="flex items-center gap-3 pt-4 border-t border-white/5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                          <div className="flex items-center gap-1.5 flex-1 w-0 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-black shrink-0">
                              {team.creator?.username.substring(0, 1).toUpperCase()}
                            </div>
                            <span className="truncate">{team.creator?.username}</span>
                          </div>
                          <span className="shrink-0 text-white/30 hidden group-hover:block transition-all">Expand &rarr;</span>
                      </div>
                    </button>
                  ))}
               </div>
             )}
          </div>
        </div>
      ) : (
        <ProjectDashboard 
          username={user.username}
          projects={projects}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectOpen(true)}
        />
      )}

      {/* Drawers & Modals remain identical for now */}
      <Drawer
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        title="Project Settings"
      >
         <div className="space-y-10">
            <div className="space-y-3">
               <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Project Details</h4>
               <div className="p-5 glass rounded-2xl space-y-4">
                  <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Name</label>
                        <input 
                          type="text"
                          defaultValue={selectedProject?.name}
                          onBlur={(e) => {
                             if (e.target.value !== selectedProject?.name) {
                               updateProjectMutation.mutate({ id: selectedProject!.id, name: e.target.value });
                             }
                          }}
                          className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[13px] font-bold outline-none focus:border-primary/40 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Description</label>
                        <textarea 
                          defaultValue={selectedProject?.description || ''}
                          onBlur={(e) => {
                             if (e.target.value !== selectedProject?.description) {
                               updateProjectMutation.mutate({ id: selectedProject!.id, description: e.target.value });
                             }
                          }}
                          placeholder="No description provided."
                          className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[12px] min-h-[80px] outline-none focus:border-primary/40 transition-colors resize-none"
                        />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-muted-foreground uppercase">Managed By</span>
                     <span className="text-[11px] font-bold text-primary">{selectedProject?.creator?.username}</span>
                  </div>
               </div>
            </div>

            <MemberManager 
               members={projectMembers}
               onAdd={(uid) => addProjectMemberMutation.mutate(uid)}
               onRemove={(mid) => removeProjectMemberMutation.mutate(mid)}
               projectId={selectedProjectId}
            />

            <div className="pt-6">
              <button 
                onClick={() => {
                   setIsProjectSettingsOpen(false);
                   setConfirmModal({
                     isOpen: true,
                     title: 'Delete Project',
                     message: 'This will permanently delete the project and all associated data. Proceed?',
                     variant: 'danger',
                     onConfirm: () => {
                        deleteProjectMutation.mutate(selectedProjectId!);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                     }
                   });
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 border border-red-500/20 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all text-[13px] font-bold"
              >
                 <Trash2 size={16} />
                 Delete Project
              </button>
            </div>
         </div>
      </Drawer>

      <Drawer
        isOpen={!!selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
        title={`Team Intelligence: ${selectedTeam?.name}`}
      >
        <div className="space-y-8">
            <MemberManager 
              title="Assigned Strategists"
              members={teamMembers}
              onAdd={(uid) => addTeamMemberMutation.mutate(uid)}
              onRemove={(mid) => removeTeamMemberMutation.mutate(mid)}
              projectId={selectedProjectId}
            />
            
            <button
               onClick={() => {
                 setSelectedTeamId(null);
                 setConfirmModal({
                  isOpen: true,
                  title: 'Decommission Team',
                  message: `Remove all members from ${selectedTeam?.name}?`,
                  variant: 'danger',
                  onConfirm: () => {
                     deleteTeamMutation.mutate(selectedTeamId!);
                     setConfirmModal(prev => ({...prev, isOpen: false}));
                  }
                 })
               }}
               className="w-full py-3 border border-red-500/30 text-red-500 rounded-2xl text-[13px] font-bold hover:bg-red-500 hover:text-white transition-all"
            >
               Delete Team
            </button>
        </div>
      </Drawer>

      <Drawer
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        title="Task Details"
        width={550}
      >
         {selectedTask && (
           <div className="space-y-8">
              <div className="flex items-center gap-4 p-5 glass rounded-2xl">
                 <button 
                  onClick={() => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, status: selectedTask.status === 'DONE' ? 'TODO' : 'DONE' })}
                  className="p-1 hover:scale-110 transition-transform"
                 >
                    {selectedTask.status === 'DONE' ? <CheckCircle2 size={26} className="text-primary" /> : <Circle size={26} className="text-muted-foreground/40" />}
                 </button>
                 <input 
                   type="text"
                   defaultValue={selectedTask.title}
                   onBlur={(e) => {
                     if (e.target.value !== selectedTask.title) updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, title: e.target.value });
                   }}
                   className="bg-transparent border-none text-xl font-bold outline-none flex-1 text-foreground/90"
                 />
              </div>

              <div className="space-y-3 pl-1">
                 <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FolderEdit size={12} />
                    Description
                 </h4>
                 <textarea 
                   defaultValue={selectedTask.description}
                   onBlur={(e) => {
                     if (e.target.value !== selectedTask.description) updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, description: e.target.value });
                   }}
                   placeholder="Describe this task..."
                   className="w-full glass rounded-3xl p-5 text-sm min-h-[120px] outline-none focus:ring-2 ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/20 leading-relaxed"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Assignee</h4>
                    <UserSearchDropdown 
                      placeholder={selectedTask.memberId ? 'Reassign...' : 'Search agent...'}
                      className="rounded-2xl bg-white/[0.03] border-white/5 py-3 text-xs"
                      onSelect={(u) => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, memberId: u.id })}
                    />
                 </div>
                 <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Team</h4>
                    <select 
                      value={selectedTask.teamId || ''}
                      onChange={(e) => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, teamId: e.target.value || null })}
                      className="w-full glass border-white/5 rounded-2xl p-3 text-xs outline-none focus:ring-1 ring-primary/30"
                    >
                       <option value="">Detached</option>
                       {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-1">
                    <Zap size={12} className="text-amber-500" />
                    Automations
                 </h4>
                 <div className="grid grid-cols-1 gap-2">
                     {taskTriggers.map(t => (
                       <div key={t.id} className="group p-3 glass rounded-xl flex items-center justify-between border-white/[0.02]">
                          <div className="flex flex-col flex-1 truncate pr-3">
                             <span className="text-xs font-bold truncate">{t.name}</span>
                             <span className="text-[9px] uppercase tracking-wider text-muted-foreground opacity-60">{t.triggerType}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => {
                                  setEditTriggerId(t.id);
                                  setTriggerForm({
                                    name: t.name,
                                    type: t.triggerType as TaskTriggerType,
                                    data: t.triggerData || {}
                                  });
                                  setIsCreateTriggerOpen(true);
                                }}
                                className="p-1 px-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold"
                             >
                                Edit
                             </button>
                             <button 
                                onClick={() => deleteTaskTriggerMutation.mutate(t.id)}
                                className="p-1 px-2.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold"
                             >
                                Delete
                             </button>
                          </div>
                       </div>
                     ))}
                     <button 
                       onClick={() => {
                         setEditTriggerId(null);
                         setTriggerForm({
                           name: '',
                           type: 'BLOCK_PARENT_DONE',
                           data: { revertStatusTo: 'IN_PROGRESS' }
                         });
                         setIsCreateTriggerOpen(true);
                       }}
                       className="w-full py-2.5 border border-dashed border-white/10 rounded-2xl text-[11px] font-bold text-muted-foreground hover:bg-white/5 hover:border-primary/20 transition-all"
                     >
                       + Add Automation
                    </button>
                 </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button
                  onClick={() => {
                    setSelectedTaskId(null);
                    setConfirmModal({
                      isOpen: true,
                      title: 'Delete Task',
                      message: 'Are you sure you want to delete this task? This action cannot be undone.',
                      variant: 'danger',
                      onConfirm: () => {
                        deleteTasksMutation.mutate([selectedTaskId!]);
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      }
                    });
                  }}
                  className="w-full py-3 border border-red-500/30 text-red-500 rounded-2xl text-[13px] font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  Delete Task
                </button>
              </div>
           </div>
         )}
      </Drawer>

      <Modal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        title="Create Project"
        description="Initialize a new workspace for your team."
        footer={
           <button 
            disabled={!projectName.trim()}
            onClick={() => {
              createProjectMutation.mutate({ name: projectName, description: projectDescription });
              setIsCreateProjectOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-indigo-500 transition-all disabled:opacity-30"
           >
             Create
           </button>
        }
      >
         <div className="space-y-4">
           <input 
              autoFocus
              type="text"
              placeholder="Project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full glass rounded-2xl p-4 outline-none border-white/10 focus:border-primary/40 text-sm"
           />
           <textarea
              placeholder="Project description (optional)..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="w-full glass rounded-2xl p-4 outline-none border-white/10 focus:border-primary/40 text-sm min-h-[100px] resize-none"
           />
         </div>
      </Modal>

      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title="Create Task"
        footer={
          <button 
            disabled={!taskTitle.trim()}
            onClick={() => {
              createTaskMutation.mutate({ title: taskTitle, parentTaskId: parentTaskIdForNew });
              setIsCreateTaskOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold active:scale-95 transition-transform"
          >
            Create Task
          </button>
        }
      >
         <input 
           autoFocus
           type="text"
           placeholder="Task title..."
           value={taskTitle}
           onChange={(e) => setTaskTitle(e.target.value)}
           onKeyDown={(e) => {
             if (e.key === 'Enter' && taskTitle.trim()) {
               createTaskMutation.mutate({ title: taskTitle, parentTaskId: parentTaskIdForNew });
               setIsCreateTaskOpen(false);
             }
           }}
           className="w-full glass rounded-2xl p-4 outline-none border-white/10 text-sm focus:border-primary/30"
         />
      </Modal>

      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        title={confirmModal.title}
        footer={
          <button 
            onClick={confirmModal.onConfirm}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[12px] font-bold text-white shadow-xl",
              confirmModal.variant === 'danger' ? "bg-red-500" : "bg-primary"
            )}
          >
            Proceed
          </button>
        }
      >
         <div className="flex gap-4">
            <div className={cn(
              "p-3 rounded-2xl",
              confirmModal.variant === 'danger' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
            )}>
               <AlertTriangle size={24} />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">{confirmModal.message}</p>
         </div>
      </Modal>

      <Modal
        isOpen={isCreateTriggerOpen}
        onClose={() => setIsCreateTriggerOpen(false)}
        title={editTriggerId ? "Edit Automation" : "Add Automation"}
        footer={
          <button 
            disabled={!triggerForm.name.trim()}
            onClick={() => {
              if (editTriggerId) {
                updateTaskTriggerMutation.mutate({ 
                  triggerId: editTriggerId,
                  name: triggerForm.name, 
                  triggerType: triggerForm.type, 
                  triggerData: triggerForm.data 
                });
              } else {
                addTaskTriggerMutation.mutate({ 
                  name: triggerForm.name, 
                  triggerType: triggerForm.type, 
                  triggerData: triggerForm.data 
                });
              }
              setIsCreateTriggerOpen(false);
            }}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-[12px] font-bold disabled:opacity-50"
          >
            {editTriggerId ? "Save Changes" : "Save Automation"}
          </button>
        }
      >
        <div className="space-y-4">
           <div>
             <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Automation Name</label>
             <input 
               placeholder="e.g., Ping Marketing Team on Done"
               value={triggerForm.name}
               onChange={(e) => setTriggerForm({...triggerForm, name: e.target.value})}
               className="w-full glass border border-white/5 focus:border-amber-500/50 rounded-xl p-3 text-sm outline-none transition-colors"
             />
           </div>

           <div>
             <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Trigger Type</label>
             <select 
                value={triggerForm.type}
                onChange={(e) => {
                  const type = e.target.value as TaskTriggerType;
                  let data = {};
                  if (type === 'BLOCK_PARENT_DONE') data = { revertStatusTo: 'IN_PROGRESS' };
                  if (type === 'WEBHOOK') data = { url: '' };
                  if (type === 'NOTIFY_PARENT_TEAM' || type === 'NOTIFY_TASK_TEAM') data = { message: '' };
                  setTriggerForm({...triggerForm, type, data});
                }}
                className="w-full glass border border-white/5 focus:border-amber-500/50 rounded-xl p-3 text-sm outline-none transition-colors"
             >
                <option value="BLOCK_PARENT_DONE">Guard: Block Parent Completion</option>
                <option value="WEBHOOK">System: Outbound Webhook</option>
                <option value="NOTIFY_PARENT_TEAM">Alert: Notify Parent Team</option>
                <option value="NOTIFY_TASK_TEAM">Alert: Notify Task Team</option>
             </select>
           </div>

           {/* Dynamic Parameter Rendering */}
           <div className="pt-4 border-t border-white/5 space-y-4">
             {triggerForm.type === 'BLOCK_PARENT_DONE' && (
               <div>
                 <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Revert Status To</label>
                 <select 
                    value={triggerForm.data.revertStatusTo || 'IN_PROGRESS'}
                    onChange={(e) => setTriggerForm({...triggerForm, data: { ...triggerForm.data, revertStatusTo: e.target.value }})}
                    className="w-full glass border border-white/5 focus:border-amber-500/50 rounded-xl p-3 text-sm outline-none transition-colors"
                 >
                    <option value="TODO">TODO (Not Started)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (Working)</option>
                    <option value="BLOCKED">BLOCKED (Blocked)</option>
                    <option value="DONE">DONE (Completed)</option>
                 </select>
                 <p className="text-[10px] text-muted-foreground/60 mt-1 pl-1">If the parent task is marked DONE prematurely, it will be immediately reverted to this status.</p>
               </div>
             )}

             {triggerForm.type === 'WEBHOOK' && (
               <div>
                 <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Webhook Target URL</label>
                 <input 
                   placeholder="https://api.example.com/webhook"
                   value={triggerForm.data.url || ''}
                   onChange={(e) => setTriggerForm({...triggerForm, data: { ...triggerForm.data, url: e.target.value }})}
                   className="w-full glass border border-white/5 focus:border-amber-500/50 rounded-xl p-3 text-sm outline-none transition-colors"
                 />
                 <p className="text-[10px] text-muted-foreground/60 mt-1 pl-1">We will POST a JSON payload to this endpoint when the task updates.</p>
               </div>
             )}

             {(triggerForm.type === 'NOTIFY_PARENT_TEAM' || triggerForm.type === 'NOTIFY_TASK_TEAM') && (
               <div>
                 <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Notification Message</label>
                 <textarea 
                   placeholder="This task has been completed. Please review."
                   value={triggerForm.data.message || ''}
                   onChange={(e) => setTriggerForm({...triggerForm, data: { ...triggerForm.data, message: e.target.value }})}
                   className="w-full glass border border-white/5 focus:border-amber-500/50 rounded-xl p-3 text-sm outline-none transition-colors resize-none h-24"
                 />
               </div>
             )}
           </div>
        </div>
      </Modal>
      <Modal
        isOpen={isCreateTeamOpen}
        onClose={() => setIsCreateTeamOpen(false)}
        title="Forge New Team"
        description="Organize participants into a dedicated task group."
        footer={
           <button 
            disabled={!teamName.trim()}
            onClick={() => {
              createTeamMutation.mutate(teamName);
              setIsCreateTeamOpen(false);
              setTeamName('');
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-indigo-500 transition-all disabled:opacity-30"
           >
             Forge Team
           </button>
        }
      >
         <input 
            autoFocus
            type="text"
            placeholder="Team designation..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && teamName.trim()) {
                createTeamMutation.mutate(teamName);
                setIsCreateTeamOpen(false);
                setTeamName('');
              }
            }}
            className="w-full glass rounded-2xl p-4 outline-none border-white/10 focus:border-primary/40 text-sm"
         />
      </Modal>
    </WorkspaceLayout>
  );
};
