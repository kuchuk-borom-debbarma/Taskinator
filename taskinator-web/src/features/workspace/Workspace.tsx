import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  FolderEdit, 
  Trash2, 
  Users2, 
  AlertTriangle,
  Zap,
  Link
} from 'lucide-react';
import { ProjectSidebar } from '../../components/ProjectSidebar';
import { TaskDrillView } from '../../components/TaskDrillView';
import { StatusPicker } from '../../components/StatusPicker';
import { Drawer } from '../../components/Drawer';
import { MemberManager } from '../../components/MemberManager';
import { Modal } from '../../components/Modal';
import { Header } from '../../components/Header';
import { NotificationPanel } from '../../components/NotificationPanel';
import { UserSearchDropdown } from '../../components/UserSearchDropdown';
import { WorkspaceLayout } from '../../layouts/WorkspaceLayout';
import { ProjectDashboard } from './ProjectDashboard';
import { AutomationBuilderModal, type AutomationRule } from '../../components/AutomationBuilderModal';
import { RelationshipCreator } from '../../components/RelationshipCreator';
import { RelationshipPill } from '../../components/RelationshipPill';
import { useRealtime } from '../../hooks/useRealtime.ts';
import type { JWTPayload } from '../../types';
import { gqlClient } from '../../graphql/client';
import {
  GET_PROJECTS, GET_WORKSPACE_DATA, GET_PROJECT_MEMBERS, GET_TEAM_MEMBERS, GET_UNREAD_NOTIFICATIONS_COUNT, GET_AUTOMATIONS,
  CREATE_PROJECT, UPDATE_PROJECT, DELETE_PROJECTS, CREATE_TEAM, DELETE_TEAMS, ADD_PROJECT_MEMBERS, REMOVE_PROJECT_MEMBERS, ADD_TEAM_MEMBERS, REMOVE_TEAM_MEMBERS,
  CREATE_TASK, UPDATE_TASKS, DELETE_TASKS, ADD_AUTOMATION, DELETE_AUTOMATION, UPDATE_AUTOMATION,
  CREATE_TASK_LINK, DELETE_TASK_LINK
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
  const [taskDescription, setTaskDescription] = useState('');

  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);
  const [editAutomationId, setEditAutomationId] = useState<string | null>(null);
  const [editAutomationRule, setEditAutomationRule] = useState<AutomationRule>();

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

  // Auto-focus first task on project entry once data is loaded
  React.useEffect(() => {
    if (selectedProjectId && projectTasks.length > 0) {
        const isCurrentFocusValid = projectTasks.some((t: any) => t.id === focusedTaskId);
        if (!isCurrentFocusValid) {
            setFocusedTaskId(projectTasks[0].id);
        }
    }
  }, [selectedProjectId, projectTasks, focusedTaskId]);

  const { data: automationsData } = useQuery({
    queryKey: ['automations', selectedTaskId],
    queryFn: () => gqlClient.request<any>(GET_AUTOMATIONS, { taskId: selectedTaskId }),
    enabled: !!selectedTaskId,
  });
  const taskAutomations = (automationsData?.automations?.edges ?? []).map((e: any) => e.node);

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
  const addAutomationMutation = useMutation({
    mutationFn: (rules: AutomationRule[]) =>
      gqlClient.request<any>(ADD_AUTOMATION, {
        taskId: selectedTaskId!,
        projectId: selectedProjectId!,
        name: rules[0].name,
        targetScope: 'TASK',
        rules: JSON.stringify(rules),
        isActive: true
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', selectedTaskId] }),
  });

  const updateAutomationMutation = useMutation({
    mutationFn: (data: { automationId: string; rules: AutomationRule[] }) =>
      gqlClient.request<any>(UPDATE_AUTOMATION, {
        automationId: data.automationId,
        name: data.rules[0].name,
        rules: JSON.stringify(data.rules)
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', selectedTaskId] }),
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: (automationId: string) => gqlClient.request<any>(DELETE_AUTOMATION, { automationId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', selectedTaskId] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      gqlClient.request<any>(CREATE_TASK, {
        projectId: selectedProjectId!,
        title: data.title,
        description: data.description || '',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const createTaskLinkMutation = useMutation({
    mutationFn: (data: { fromTaskId: string; toTaskId: string; linkType: string }) =>
      gqlClient.request<any>(CREATE_TASK_LINK, {
        projectId: selectedProjectId!,
        ...data
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace', selectedProjectId, userId] }),
  });

  const deleteTaskLinkMutation = useMutation({
    mutationFn: (data: { projectId: string; linkId: string }) =>
      gqlClient.request<any>(DELETE_TASK_LINK, data),
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
                 onCreateTask={() => {
                   setTaskTitle('');
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
                 <StatusPicker 
                   status={selectedTask.status} 
                   onChange={(newStatus) => updateTaskMutation.mutate({ 
                     id: selectedTask.id, 
                     version: selectedTask.version, 
                     status: newStatus 
                   })} 
                 />
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

              {/* Relationship Management Section */}
              <div className="space-y-4">
                  <div className="flex items-center justify-between pl-1">
                      <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Link size={12} className="text-primary" />
                        Neural Connections
                      </h4>
                      <button 
                        onClick={() => setIsLinkingOpen(!isLinkingOpen)}
                        className="text-[10px] font-black uppercase text-primary hover:text-indigo-400 transition-all"
                      >
                        {isLinkingOpen ? '[ Close ]' : '[ + Forge Link ]'}
                      </button>
                  </div>

                  {isLinkingOpen && (
                      <RelationshipCreator 
                        tasks={projectTasks}
                        currentTaskId={selectedTask.id}
                        onCancel={() => setIsLinkingOpen(false)}
                        onLink={(toId: string, label: string) => {
                            createTaskLinkMutation.mutate({ fromTaskId: selectedTask.id, toTaskId: toId, linkType: label });
                            setIsLinkingOpen(false);
                        }}
                      />
                  )}

                  <div className="space-y-2">
                      {selectedTask.links?.map((link: any) => (
                          <div key={link.id} className="glass p-3 rounded-xl flex items-center justify-between border-white/[0.02] group">
                               <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <RelationshipPill label={link.type} size="sm" />
                                    <span className="text-xs font-bold truncate text-foreground/80">{link.toTask?.title}</span>
                               </div>
                               <button 
                                 onClick={() => {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Sever Connection',
                                        message: `Are you sure you want to delete the '${link.type}' link to '${link.toTask?.title}'?`,
                                        variant: 'danger',
                                        onConfirm: () => {
                                            deleteTaskLinkMutation.mutate({ projectId: selectedProjectId!, linkId: link.id });
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                    });
                                 }}
                                 className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-all"
                               >
                                    <Trash2 size={14} />
                               </button>
                          </div>
                      ))}
                      {(!selectedTask.links || selectedTask.links.length === 0) && !isLinkingOpen && (
                          <div className="text-xs text-muted-foreground/30 italic p-2 text-center border-2 border-dashed border-white/5 rounded-2xl">
                             Standalone task. No outgoing links.
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 pl-1">
                    <Zap size={12} className="text-amber-500" />
                    Automations
                 </h4>
                 <div className="grid grid-cols-1 gap-2">
                     {taskAutomations.map((a: any) => {
                        const parsedRules: AutomationRule[] = typeof a.rules === 'string' ? JSON.parse(a.rules) : a.rules;
                        const firstRule = parsedRules[0];
                        const actionsCount = firstRule?.then?.length || 0;

                        return (
                       <div key={a.id} className="group p-3 glass rounded-xl flex items-center justify-between border-white/[0.02]">
                          <div className="flex flex-col flex-1 truncate pr-3">
                             <span className="text-xs font-bold truncate">{a.name || 'Untitled Flow'}</span>
                             <span className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mt-0.5">
                               {actionsCount} Action{actionsCount !== 1 ? 's' : ''} • Task Scoped
                             </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => {
                                  setEditAutomationId(a.id);
                                  setEditAutomationRule(firstRule);
                                  setIsAutomationModalOpen(true);
                                }}
                                className="p-1 px-2.5 bg-blue-500/10 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-colors"
                             >
                                Edit
                             </button>
                             <button 
                                onClick={() => deleteAutomationMutation.mutate(a.id)}
                                className="p-1 px-2.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold hover:bg-red-500 hover:text-white transition-colors"
                             >
                                Delete
                             </button>
                          </div>
                       </div>
                     )})}
                     
                     {taskAutomations.length === 0 && (
                       <div className="text-xs text-muted-foreground/50 italic px-2 py-1">No automations active on this task.</div>
                     )}

                     <button 
                       onClick={() => {
                         setEditAutomationId(null);
                         setEditAutomationRule(undefined);
                         setIsAutomationModalOpen(true);
                       }}
                       className="w-full py-2.5 border border-dashed border-white/10 rounded-2xl text-[11px] font-bold text-muted-foreground hover:bg-white/5 hover:border-primary/20 transition-all flex items-center justify-center gap-2"
                     >
                       <Zap size={14} className="text-amber-500/50" /> Add Automation
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
              createTaskMutation.mutate({ title: taskTitle, description: taskDescription });
              setIsCreateTaskOpen(false);
            }}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-[12px] font-bold active:scale-95 transition-transform"
          >
            Create Task
          </button>
        }
      >
         <div className="space-y-4">
           <input 
             autoFocus
             type="text"
             placeholder="Task title..."
             value={taskTitle}
             onChange={(e) => setTaskTitle(e.target.value)}
             className="w-full glass rounded-2xl p-4 outline-none border-white/10 text-sm focus:border-primary/30"
           />
           <textarea
             placeholder="Task description (optional)..."
             value={taskDescription}
             onChange={(e) => setTaskDescription(e.target.value)}
             className="w-full glass rounded-2xl p-4 outline-none border-white/10 text-sm min-h-[100px] resize-none focus:border-primary/30"
           />
         </div>
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

      <AutomationBuilderModal
        key={editAutomationId || 'new'}
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
        initialRule={editAutomationRule}
        title={editAutomationId ? "Edit Automation" : "Design New Automation"}
        tasks={projectTasks}
        onSave={(rules) => {
           if (editAutomationId) {
             updateAutomationMutation.mutate({ automationId: editAutomationId, rules });
           } else {
             addAutomationMutation.mutate(rules);
           }
           setIsAutomationModalOpen(false);
        }}
      />
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
