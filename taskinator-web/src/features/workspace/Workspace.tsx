import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Settings, 
  Trash2, 
  FolderEdit, 
  Zap, 
  AlertTriangle,
  Target,
  Users2,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { TaskTree } from '../../components/TaskTree';
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
  CREATE_PROJECT, DELETE_PROJECTS, CREATE_TEAM, DELETE_TEAMS, ADD_PROJECT_MEMBERS, REMOVE_PROJECT_MEMBERS, ADD_TEAM_MEMBERS, REMOVE_TEAM_MEMBERS,
  CREATE_TASK, UPDATE_TASKS, DELETE_TASKS, ADD_TASK_TRIGGER, DELETE_TASK_TRIGGER
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
  const [showTeamsPanel, setShowTeamsPanel] = useState(false);

  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');

  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [parentTaskIdForNew, setParentTaskIdForNew] = useState<string>();

  const [isCreateTriggerOpen, setIsCreateTriggerOpen] = useState(false);
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

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => gqlClient.request<any>(CREATE_PROJECT, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', userId] }),
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
        />
      }
      sidePanel={
        showTeamsPanel ? (
          <div className="h-full flex flex-col p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users2 size={16} className="text-primary" />
                  <h3 className="text-sm font-bold tracking-tight uppercase tracking-widest text-muted-foreground">Teams</h3>
                </div>
                <button 
                  onClick={() => setIsCreateTeamOpen(true)}
                  disabled={!selectedProjectId}
                  className="p-1.5 hover:bg-white/5 rounded-md text-muted-foreground disabled:opacity-20"
                >
                  <Plus size={16} />
                </button>
            </div>
            
            <div className="space-y-3">
                {teams.map((team: any) => (
                  <button 
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-300 group",
                      selectedTeamId === team.id 
                        ? "bg-primary/5 border-primary/20 ring-1 ring-primary/20" 
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    )}
                  >
                    <p className="text-[13px] font-bold text-foreground/90 mb-1">{team.name}</p>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-[7px] font-bold">
                          {team.creator?.username.substring(0, 1).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">{team.creator?.username}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : undefined
      }
    >
      <NotificationPanel 
        isOpen={isNotifPanelOpen}
        onClose={() => setIsNotifPanelOpen(false)}
        userId={userId}
      />

      {selectedProjectId ? (
        <div className="h-full flex flex-col min-h-0 relative">
          {/* Focused View Hero */}
          <div className="px-10 py-10 flex items-center justify-between shrink-0">
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-foreground/90">{selectedProject?.name}</h2>
              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                 <div className="flex items-center gap-1.5">
                    <Target size={12} className="text-primary" />
                    <span>Infiltration Status: Active</span>
                 </div>
                 <div className="w-[1px] h-3 bg-white/5" />
                 <button 
                    onClick={() => setShowTeamsPanel(!showTeamsPanel)}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                 >
                    <Users2 size={12} />
                    <span>{teams.length} Squads deployed</span>
                 </button>
              </div>
            </div>
            <button
              onClick={() => {
                setTaskTitle('');
                setParentTaskIdForNew(undefined);
                setIsCreateTaskOpen(true);
              }}
              className="bg-primary hover:bg-indigo-500 text-white text-[13px] font-black px-8 py-3 rounded-full transition-all shadow-[0_10px_40px_rgb(99,102,241,0.3)] hover:-translate-y-1 active:scale-95 flex items-center gap-3"
            >
              <Plus size={20} strokeWidth={3} />
              Forge Task
            </button>
          </div>

          {/* Scrolling Task Tree (Centered) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TaskTree
              tasks={projectTasks}
              triggerMap={triggerMap}
              onToggleStatus={(task) => updateTaskMutation.mutate({ id: task.id, version: task.version, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
              onCreateSubtask={(id) => {
                  setTaskTitle('');
                  setParentTaskIdForNew(id);
                  setIsCreateTaskOpen(true);
              }}
              onClickTask={(task) => setSelectedTaskId(task.id)}
              onDeleteTask={(id) => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Delete Task',
                  message: 'Are you sure you want to delete this task? This action cannot be undone.',
                  variant: 'danger',
                  onConfirm: () => {
                    deleteTasksMutation.mutate([id]);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }
                });
              }}
            />
          </div>
        </div>
      ) : (
        <ProjectDashboard 
          projects={projects}
          onSelectProject={setSelectedProjectId}
          onCreateProject={() => setIsCreateProjectOpen(true)}
        />
      )}

      {/* Drawers & Modals remain identical for now */}
      <Drawer
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        title="Settings: Workspace"
      >
         <div className="space-y-10">
            <div className="space-y-3">
               <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Identification</h4>
               <div className="p-5 glass rounded-2xl space-y-4">
                  <div>
                    <p className="text-[13px] font-bold">{selectedProject?.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{selectedProject?.description || 'Managed via Nebula Core'}</p>
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
                     title: 'Archive Project',
                     message: 'This will remove all project historical data. Proceed?',
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
                 Terminate Project
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
               Dissolve Team
            </button>
        </div>
      </Drawer>

      <Drawer
        isOpen={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        title="Node Intel"
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
                    Abstract Data
                 </h4>
                 <textarea 
                   defaultValue={selectedTask.description}
                   onBlur={(e) => {
                     if (e.target.value !== selectedTask.description) updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, description: e.target.value });
                   }}
                   placeholder="Describe this node's mission..."
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
                    <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Squad</h4>
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
                    Automations active
                 </h4>
                 <div className="grid grid-cols-1 gap-2">
                    {taskTriggers.map(t => (
                      <div key={t.id} className="group p-3 glass rounded-xl flex items-center justify-between border-white/[0.02]">
                         <div className="flex flex-col">
                            <span className="text-xs font-bold">{t.name}</span>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground opacity-60">{t.triggerType}</span>
                         </div>
                         <button 
                            onClick={() => deleteTaskTriggerMutation.mutate(t.id)}
                            className="p-1 px-2.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            Kill
                         </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setIsCreateTriggerOpen(true)}
                      className="w-full py-2.5 border border-dashed border-white/10 rounded-2xl text-[11px] font-bold text-muted-foreground hover:bg-white/5 hover:border-primary/20 transition-all"
                    >
                       + New Protocol
                    </button>
                 </div>
              </div>
           </div>
         )}
      </Drawer>

      <Modal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        title="Forge New Workspace"
        description="Initiate a top-level repository for unified task tracking."
        footer={
           <button 
            disabled={!projectName.trim()}
            onClick={() => {
              createProjectMutation.mutate(projectName);
              setIsCreateProjectOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[13px] font-bold hover:bg-indigo-500 transition-all disabled:opacity-30"
           >
             Confirm Forge
           </button>
        }
      >
         <input 
            autoFocus
            type="text"
            placeholder="Repository label..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full glass rounded-2xl p-4 outline-none border-white/10 focus:border-primary/40 text-sm"
         />
      </Modal>

      <Modal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        title="Define New Node"
        footer={
          <button 
            disabled={!taskTitle.trim()}
            onClick={() => {
              createTaskMutation.mutate({ title: taskTitle, parentTaskId: parentTaskIdForNew });
              setIsCreateTaskOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold active:scale-95 transition-transform"
          >
            Deploy Node
          </button>
        }
      >
         <input 
           autoFocus
           type="text"
           placeholder="Task label..."
           value={taskTitle}
           onChange={(e) => setTaskTitle(e.target.value)}
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
        title="Initialize Protocol"
        footer={
          <button 
            onClick={() => {
              addTaskTriggerMutation.mutate(triggerForm);
              setIsCreateTriggerOpen(false);
            }}
            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-[12px] font-bold"
          >
            Inject Automation
          </button>
        }
      >
        <div className="space-y-4">
           <input 
             placeholder="Protocol Name"
             value={triggerForm.name}
             onChange={(e) => setTriggerForm({...triggerForm, name: e.target.value})}
             className="w-full glass rounded-xl p-3 text-sm outline-none"
           />
           <select 
              value={triggerForm.type}
              onChange={(e) => setTriggerForm({...triggerForm, type: e.target.value as any})}
              className="w-full glass rounded-xl p-3 text-sm outline-none"
           >
              <option value="BLOCK_PARENT_DONE">Block Parent until Done</option>
           </select>
        </div>
      </Modal>
    </WorkspaceLayout>
  );
};
