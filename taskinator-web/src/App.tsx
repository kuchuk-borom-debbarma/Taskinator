import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider, useQueries } from '@tanstack/react-query';
import { projectApi, taskApi, teamApi, notificationApi } from './api/client';
import type { UserSearchResult } from './api/client';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TaskTree } from './components/TaskTree';
import { Drawer } from './components/Drawer';
import { MemberManager } from './components/MemberManager';
import { Modal } from './components/Modal';
import { Layout, Users, Settings, Plus, Search, Bell, Trash2, FolderEdit, CheckCircle2, Circle, AlignLeft, Users2, User as UserIcon, Zap, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from './utils/cn';
import { Auth } from './components/Auth';
import { NotificationPanel } from './components/NotificationPanel';
import { UserSearchDropdown } from './components/UserSearchDropdown';
import { useRealtime } from './hooks/useRealtime.ts';
import type { JWTPayload, TaskTriggerType, TaskTrigger } from './types';
import { gqlClient } from './graphql/client';
import { GET_PROJECTS, GET_PROJECT, GET_TASKS, GET_TEAMS, CREATE_PROJECT, DELETE_PROJECTS, CREATE_TASK } from './graphql/operations';


const queryClient = new QueryClient();

interface WorkspaceProps {
    user: JWTPayload;
    onLogout: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ user, onLogout }) => {
    const userId = user.id;
    useRealtime(userId, selectedProjectId);
    const [selectedProjectId, setSelectedProjectId] = useState<string>();
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
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
        onConfirm: () => {} 
    });

    const qc = useQueryClient();

    // Queries
    const { data: projectData } = useQuery({
        queryKey: ['projects', userId],
        queryFn: () => gqlClient.request<any>(GET_PROJECTS, { first: 50 }),
        enabled: !!userId.trim(),
    });
    const projects = (projectData?.projects?.edges ?? []).map((e: any) => e.node);
    const nextCursor = projectData?.projects?.pageInfo?.endCursor;

    const { data: taskData } = useQuery({
        queryKey: ['tasks', selectedProjectId, userId],
        queryFn: () => gqlClient.request<any>(GET_TASKS, { projectId: selectedProjectId, first: 100 }),
        enabled: !!selectedProjectId && !!userId.trim(),
    });
    const projectTasks = (taskData?.tasks?.edges ?? []).map((e: any) => e.node);

    const triggerQueries = useQueries({
        queries: projectTasks.map(t => ({
            queryKey: ['task-triggers', t.id],
            queryFn: () => taskApi.getTaskTriggers(t.id),
        }))
    });

    const triggerMap = useMemo(() => {
        const map: Record<string, TaskTrigger[]> = {};
        projectTasks.forEach((t, i) => {
            if (triggerQueries[i]?.data?.triggers) {
                map[t.id] = triggerQueries[i].data!.triggers;
            }
        });
        return map;
    }, [projectTasks, triggerQueries]);

    const { data: teamData } = useQuery({
        queryKey: ['teams', selectedProjectId, userId],
        queryFn: () => gqlClient.request<any>(GET_TEAMS, { projectId: selectedProjectId, first: 50 }),
        enabled: !!selectedProjectId && !!userId.trim(),
    });
    const teams = (teamData?.teams?.edges ?? []).map((e: any) => e.node);

    const { data: memberData } = useQuery({
        queryKey: ['project-members', selectedProjectId, userId],
        queryFn: () => projectApi.getProjectMembers(userId.trim(), selectedProjectId!),
        enabled: isProjectSettingsOpen && !!selectedProjectId && !!userId.trim(),
    });
    const projectMembers = memberData?.members ?? [];

    const { data: tMemData } = useQuery({
        queryKey: ['team-members', selectedProjectId, selectedTeamId],
        queryFn: () => teamApi.getTeamMembers(userId.trim(), selectedProjectId!, selectedTeamId!),
        enabled: !!selectedTeamId && !!selectedProjectId && !!userId.trim(),
    });
    const teamMembers = tMemData?.members ?? [];

    const { data: triggerData } = useQuery({
        queryKey: ['task-triggers', selectedTaskId],
        queryFn: () => taskApi.getTaskTriggers(selectedTaskId!),
        enabled: !!selectedTaskId,
    });
    const taskTriggers = triggerData?.triggers ?? [];

    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread', userId],
        queryFn: () => notificationApi.getUnreadCount(),
    });
    const unreadCount = unreadData?.count ?? 0;

    // Mutations
    const addTaskTriggerMutation = useMutation({
        mutationFn: (data: { name: string; triggerType: TaskTriggerType; triggerData: any }) => 
            taskApi.addTaskTrigger({
                userId: userId.trim(),
                projectId: selectedProjectId!,
                taskId: selectedTaskId!,
                ...data
            }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['task-triggers', selectedTaskId] }),
    });

    const deleteTaskTriggerMutation = useMutation({
        mutationFn: (triggerId: string) => taskApi.deleteTaskTrigger(selectedTaskId!, triggerId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['task-triggers', selectedTaskId] }),
    });
    const createTaskMutation = useMutation({
        mutationFn: (data: { title: string; parentTaskId?: string }) => 
            gqlClient.request<any>(CREATE_TASK, {
                projectId: selectedProjectId!,
                title: data.title,
                description: '',
                parentTaskId: data.parentTaskId,
            }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId, userId] }),
    });

    const updateTaskMutation = useMutation({
        mutationFn: (updates: { id: string; version: number; status?: string; title?: string; description?: string; teamId?: string | null; memberId?: string | null }) => 
            taskApi.updateTasks(userId.trim(), selectedProjectId!, [updates]),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId, userId] }),
    });

    const deleteTasksMutation = useMutation({
        mutationFn: (taskIds: string[]) => taskApi.deleteTasks(userId.trim(), selectedProjectId!, taskIds),
        onSuccess: () => {
            setSelectedTaskId(null);
            qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId, userId] });
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
        mutationFn: (targetUserId: string) => projectApi.addProjectMembers({ 
            userId: userId.trim(), 
            projectId: selectedProjectId!, 
            usersToAdd: [targetUserId] 
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', selectedProjectId, userId] }),
    });

    const removeProjectMemberMutation = useMutation({
        mutationFn: (memberId: string) => projectApi.deleteProjectMembers({ 
            userId: userId.trim(), 
            projectId: selectedProjectId!, 
            memberIds: [memberId] 
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['project-members', selectedProjectId, userId] }),
    });

    const createTeamMutation = useMutation({
        mutationFn: (name: string) => teamApi.createTeams({ userId: userId.trim(), projectId: selectedProjectId!, teams: [name] }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['teams', selectedProjectId, userId] }),
    });

    const deleteTeamMutation = useMutation({
        mutationFn: (id: string) => teamApi.deleteTeams(userId.trim(), selectedProjectId!, [id]),
        onSuccess: () => {
            setSelectedTeamId(null);
            qc.invalidateQueries({ queryKey: ['teams', selectedProjectId, userId] });
        },
    });

    const addTeamMemberMutation = useMutation({
        mutationFn: (targetUserId: string) => teamApi.addTeamMembers({ 
            userId: userId.trim(), 
            projectId: selectedProjectId!, 
            teamId: selectedTeamId!, 
            members: [targetUserId] 
        }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', selectedProjectId, selectedTeamId] }),
    });

    const removeTeamMemberMutation = useMutation({
        mutationFn: (memberId: string) => {
            const member = teamMembers.find(m => m.id === memberId);
            return teamApi.deleteTeamMembers({ 
                userId: userId.trim(), 
                projectId: selectedProjectId!, 
                teamId: selectedTeamId!, 
                members: [member!.userId] 
            });
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', selectedProjectId, selectedTeamId] }),
    });

    // Handlers
    const handleCreateProject = () => {
        setProjectName('');
        setIsCreateProjectOpen(true);
    };

    const handleCreateTeam = () => {
        if (!selectedProjectId) return;
        setTeamName('');
        setIsCreateTeamOpen(true);
    };

    const handleCreateTask = (parentTaskId?: string) => {
        setTaskTitle('');
        setParentTaskIdForNew(parentTaskId);
        setIsCreateTaskOpen(true);
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const selectedTask = projectTasks.find(t => t.id === selectedTaskId);

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <ProjectSidebar 
                projects={projects}
                username={user.username}
                onLogout={onLogout}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
                onCreateProject={handleCreateProject}
            />

            <main className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Header */}
                <header className="h-14 border-b border-border/50 flex items-center justify-between px-6 shrink-0 bg-[#0d0d0d]/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[13px] font-medium">
                            <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Workspace</span>
                            <ChevronRight size={12} className="text-muted-foreground/50" />
                            <span className="text-foreground">{selectedProject?.name || 'Select a project'}</span>
                            {selectedProjectId && (
                                <button 
                                    onClick={() => setIsProjectSettingsOpen(true)}
                                    className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors ml-1"
                                >
                                    <Settings size={13} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group hidden sm:block">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search tasks..." 
                                className="bg-secondary/30 border border-border/50 focus:border-primary/40 focus:bg-secondary/50 rounded-md py-1.5 pl-9 pr-3 text-[12px] w-64 transition-all outline-none"
                                autoComplete="off"
                                data-1p-ignore
                                data-lpignore="true"
                            />
                        </div>
                        <div className="relative">
                            <button
                                id="notification-bell"
                                onClick={() => setIsNotifPanelOpen(o => !o)}
                                className="p-2 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors relative"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-background px-0.5">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            <NotificationPanel
                                isOpen={isNotifPanelOpen}
                                onClose={() => setIsNotifPanelOpen(false)}
                                userId={userId}
                            />
                        </div>
                    </div>
                </header>

                {/* Workspace Content */}
                <div className="flex-1 flex min-h-0">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border/50 overflow-hidden bg-background">
                        <div className="px-6 py-4 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border/30">
                            <div>
                                <h2 className="text-sm font-bold tracking-tight">Active Tasks</h2>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Manage and organize your project goals.</p>
                            </div>
                            <button 
                                onClick={() => handleCreateTask()}
                                disabled={!selectedProjectId}
                                className="bg-primary hover:bg-primary/90 text-white text-[12px] font-semibold px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                            >
                                <Plus size={16} />
                                New Task
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4">
                            {selectedProjectId ? (
                                <TaskTree
                                    tasks={projectTasks}
                                    triggerMap={triggerMap}
                                    onToggleStatus={(task) => updateTaskMutation.mutate({ id: task.id, version: task.version, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}

                                    onCreateSubtask={(id) => handleCreateTask(id)}
                                    onClickTask={(task) => setSelectedTaskId(task.id)}
                                    onDeleteTask={(id) => {
                                        setConfirmModal({
                                            isOpen: true,
                                            title: 'Delete Task',
                                            message: 'Are you sure you want to delete this task? All subtasks will also be deleted.',
                                            variant: 'danger',
                                            onConfirm: () => {
                                                deleteTasksMutation.mutate([id]);
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                            }
                                        });
                                    }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 space-y-6">
                                    <div className="w-20 h-20 rounded-3xl bg-secondary/30 border border-border/50 flex items-center justify-center shadow-inner">
                                        <Layout size={40} className="text-muted-foreground/40" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-semibold text-foreground">No project selected</p>
                                        <p className="text-xs">Choose a project from the sidebar to view tasks</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel (Teams) */}
                    <aside className="w-72 shrink-0 bg-[#0d0d0d]/30 overflow-y-auto hidden lg:block">
                        <div className="p-4 border-b border-border/30 flex items-center justify-between bg-background/50">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-muted-foreground" />
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Team Directory</h3>
                            </div>
                            <button 
                                onClick={handleCreateTeam}
                                disabled={!selectedProjectId}
                                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        
                        <div className="p-3 space-y-1">
                            {teams.length > 0 ? (
                                teams.map(team => (
                                    <div 
                                        key={team.id} 
                                        onClick={() => setSelectedTeamId(team.id)}
                                        className={cn(
                                            "group p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                                            selectedTeamId === team.id 
                                                ? "bg-secondary border-border/50 shadow-sm" 
                                                : "hover:bg-secondary/40 hover:border-border/20"
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-[13px] font-semibold text-foreground">{team.name}</h4>
                                            <Settings size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1.5">
                                                <div className="w-4 h-4 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[7px] font-bold text-white">
                                                    {team.createdBy.substring(0,1).toUpperCase()}
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">Created by {team.createdBy}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-border/20 rounded-xl m-2">
                                    <p className="text-[11px] text-muted-foreground">No teams defined</p>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </main>

            {/* Project Settings Drawer */}
            <Drawer 
                isOpen={isProjectSettingsOpen} 
                onClose={() => setIsProjectSettingsOpen(false)} 
                title="Project Settings"
            >
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <FolderEdit size={16} />
                            Details
                        </h4>
                        <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                            <p className="text-sm font-medium">{selectedProject?.name}</p>
                            <p className="text-xs text-muted mt-1">{selectedProject?.description || 'No description'}</p>
                        </div>
                    </div>

                    <MemberManager 
                        title="Project Members"
                        members={projectMembers}
                        onAdd={(uid) => addProjectMemberMutation.mutate(uid)}
                        onRemove={(id) => removeProjectMemberMutation.mutate(id)}
                        placeholder="Enter User ID to invite..."
                    />

                    <div className="pt-4 border-t border-border">
                        <button 
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    title: 'Delete Project',
                                    message: `Are you sure you want to delete "${selectedProject?.name}"? This will permanently delete all associated teams and tasks.`,
                                    variant: 'danger',
                                    onConfirm: () => {
                                        deleteProjectMutation.mutate(selectedProjectId!);
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }
                                });
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Project
                        </button>
                    </div>
                </div>
            </Drawer>

            {/* Team Detail Drawer */}
            <Drawer 
                isOpen={!!selectedTeamId} 
                onClose={() => setSelectedTeamId(null)} 
                title={`Team: ${selectedTeam?.name}`}
            >
                <div className="space-y-8">
                    <MemberManager 
                        title="Team Members"
                        members={teamMembers}
                        onAdd={(userId) => addTeamMemberMutation.mutate(userId)}
                        onRemove={(id) => removeTeamMemberMutation.mutate(id)}
                        projectId={selectedProjectId!}
                    />

                    <div className="pt-4 border-t border-border">
                        <button 
                            onClick={() => {
                                setConfirmModal({
                                    isOpen: true,
                                    title: 'Delete Team',
                                    message: `Are you sure you want to delete "${selectedTeam?.name}"?`,
                                    variant: 'danger',
                                    onConfirm: () => {
                                        deleteTeamMutation.mutate(selectedTeamId!);
                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    }
                                });
                            }}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-sm font-medium"
                        >
                            <Trash2 size={16} />
                            Delete Team
                        </button>
                    </div>
                </div>
            </Drawer>

            {/* Task Detail Drawer */}
            <Drawer 
                isOpen={!!selectedTaskId} 
                onClose={() => setSelectedTaskId(null)} 
                title="Task Details"
            >
                {selectedTask && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                            <button 
                                onClick={() => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, status: selectedTask.status === 'DONE' ? 'TODO' : 'DONE' })}
                                className="text-muted hover:text-primary transition-colors"
                            >
                                {selectedTask.status === 'DONE' ? <CheckCircle2 size={24} className="text-primary" /> : <Circle size={24} />}
                            </button>
                            <input 
                                type="text"
                                defaultValue={selectedTask.title}
                                onBlur={(e) => {
                                    if (e.target.value !== selectedTask.title) {
                                        updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, title: e.target.value });
                                    }
                                }}
                                className="bg-transparent border-none text-lg font-semibold outline-none flex-1"
                                autoComplete="off"
                                data-1p-ignore
                                data-lpignore="true"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <AlignLeft size={12} />
                                Description
                            </label>
                            <textarea 
                                defaultValue={selectedTask.description}
                                onBlur={(e) => {
                                    if (e.target.value !== selectedTask.description) {
                                        updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, description: e.target.value });
                                    }
                                }}
                                placeholder="Add a description..."
                                className="w-full bg-secondary/30 border border-border rounded-md p-3 text-sm min-h-[100px] outline-none focus:border-primary/50 transition-all resize-none"
                                autoComplete="off"
                                data-1p-ignore
                                data-lpignore="true"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <Users2 size={12} />
                                    Team
                                </label>
                                <select 
                                    value={selectedTask.teamId || ''}
                                    onChange={(e) => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, teamId: e.target.value || null })}
                                    className="w-full bg-secondary/30 border border-border rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary/50"
                                >
                                    <option value="">Unassigned</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                    <UserIcon size={12} />
                                    Assignee
                                </label>
                                {selectedTask.memberId && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 bg-secondary/30 border border-border rounded-md">
                                        <div className="w-5 h-5 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                                            {selectedTask.memberId.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-[11px] font-mono flex-1 truncate opacity-70">{selectedTask.memberId}</span>
                                        <button
                                            onClick={() => updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, memberId: null })}
                                            className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                <UserSearchDropdown
                                    placeholder={selectedTask.memberId ? 'Change assignee...' : 'Search & assign user...'}
                                    teamContext={selectedTask.teamId ? { projectId: selectedProjectId!, teamId: selectedTask.teamId } : undefined}
                                    onSelect={(user: UserSearchResult) =>
                                        updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, memberId: user.id })
                                    }
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border space-y-4">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                <Zap size={12} />
                                Automations
                            </label>
                            
                            <div className="space-y-2">
                                {taskTriggers.map(trigger => (
                                    <div key={trigger.id} className="group text-xs p-2 bg-secondary/20 rounded border border-border flex items-center justify-between hover:border-border/60 transition-colors">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{trigger.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{trigger.triggerType.replace(/_/g, ' ')}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmModal({
                                                    isOpen: true,
                                                    title: 'Remove Automation',
                                                    message: `Are you sure you want to remove the automation "${trigger.name}"?`,
                                                    variant: 'danger',
                                                    onConfirm: () => {
                                                        deleteTaskTriggerMutation.mutate(trigger.id);
                                                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                    }
                                                });
                                            }}
                                            className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                
                                <button 
                                    onClick={() => {
                                        setTriggerForm({ 
                                            name: '', 
                                            type: 'BLOCK_PARENT_DONE', 
                                            data: { revertStatusTo: 'IN_PROGRESS' } 
                                        });
                                        setIsCreateTriggerOpen(true);
                                    }}
                                    className="w-full py-2 border border-dashed border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                                >
                                    + Add Automation
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border">
                            <button 
                                onClick={() => {
                                    setConfirmModal({
                                        isOpen: true,
                                        title: 'Delete Task',
                                        message: `Are you sure you want to delete this task?`,
                                        variant: 'danger',
                                        onConfirm: () => {
                                            deleteTasksMutation.mutate([selectedTask.id]);
                                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                        }
                                    });
                                }}
                                className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400 transition-colors"
                            >
                                <Trash2 size={14} />
                                Delete Task
                            </button>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Modals */}
            
            {/* Confirmation Modal */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                footer={
                    <>
                        <button 
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmModal.onConfirm}
                            className={cn(
                                "px-4 py-2 text-xs font-bold rounded-md transition-all",
                                confirmModal.variant === 'danger' ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary hover:bg-primary/90 text-white"
                            )}
                        >
                            Confirm
                        </button>
                    </>
                }
            >
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "p-2 rounded-full",
                        confirmModal.variant === 'danger' ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                    )}>
                        <AlertTriangle size={20} />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {confirmModal.message}
                    </p>
                </div>
            </Modal>

            {/* Create Project Modal */}
            <Modal
                isOpen={isCreateProjectOpen}
                onClose={() => setIsCreateProjectOpen(false)}
                title="Create New Project"
                description="Projects are top-level containers for your teams and tasks."
                footer={
                    <>
                        <button 
                            onClick={() => setIsCreateProjectOpen(false)}
                            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!projectName.trim()}
                            onClick={() => {
                                createProjectMutation.mutate(projectName);
                                setIsCreateProjectOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
                        >
                            Create Project
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Project Name</label>
                        <input 
                            autoFocus
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="e.g. Marketing Campaign"
                            className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
            </Modal>

            {/* Create Team Modal */}
            <Modal
                isOpen={isCreateTeamOpen}
                onClose={() => setIsCreateTeamOpen(false)}
                title="Create New Team"
                description="Teams own tasks and represent a group of members."
                footer={
                    <>
                        <button 
                            onClick={() => setIsCreateTeamOpen(false)}
                            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!teamName.trim()}
                            onClick={() => {
                                createTeamMutation.mutate(teamName);
                                setIsCreateTeamOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
                        >
                            Create Team
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Team Name</label>
                        <input 
                            autoFocus
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="e.g. Frontend Engineering"
                            className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
            </Modal>

            {/* Create Task Modal */}
            <Modal
                isOpen={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
                title={parentTaskIdForNew ? "Add Subtask" : "Create New Task"}
                description="Tasks can be assigned to teams and organized into hierarchies."
                footer={
                    <>
                        <button 
                            onClick={() => setIsCreateTaskOpen(false)}
                            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!taskTitle.trim()}
                            onClick={() => {
                                createTaskMutation.mutate({ title: taskTitle, parentTaskId: parentTaskIdForNew });
                                setIsCreateTaskOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
                        >
                            Create Task
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Task Title</label>
                        <input 
                            autoFocus
                            type="text"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
            </Modal>

            {/* Create Trigger Modal */}
            <Modal
                isOpen={isCreateTriggerOpen}
                onClose={() => setIsCreateTriggerOpen(false)}
                title="Add Automation"
                description="Define rules that trigger automatically when tasks are completed."
                footer={
                    <>
                        <button 
                            onClick={() => setIsCreateTriggerOpen(false)}
                            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={!triggerForm.name.trim()}
                            onClick={() => {
                                addTaskTriggerMutation.mutate({ 
                                    name: triggerForm.name, 
                                    triggerType: triggerForm.type, 
                                    triggerData: triggerForm.data 
                                });
                                setIsCreateTriggerOpen(false);
                            }}
                            className="px-4 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            Create Automation
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Automation Name</label>
                        <input 
                            autoFocus
                            type="text"
                            value={triggerForm.name}
                            onChange={(e) => setTriggerForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Sync Parent Status"
                            className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Trigger Type</label>
                        <select 
                            value={triggerForm.type}
                            onChange={(e) => {
                                const newType = e.target.value as TaskTriggerType;
                                let newData = {};
                                if (newType === 'BLOCK_PARENT_DONE') newData = { revertStatusTo: 'IN_PROGRESS' };
                                if (newType === 'WEBHOOK') newData = { url: '', secret: '' };
                                setTriggerForm(prev => ({ ...prev, type: newType, data: newData }));
                            }}
                            className="w-full bg-secondary/30 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
                        >
                            <option value="BLOCK_PARENT_DONE">Block Parent Done (Guard)</option>
                            <option value="WEBHOOK">Webhook (External)</option>
                            <option value="NOTIFY_PARENT_TEAM">Notify Parent Team</option>
                            <option value="NOTIFY_TASK_TEAM">Notify Task Team</option>
                        </select>
                    </div>

                    {triggerForm.type === 'BLOCK_PARENT_DONE' && (
                        <div className="space-y-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <label className="text-[10px] uppercase font-bold text-primary/70">Revert Parent Status To</label>
                            <select 
                                value={triggerForm.data.revertStatusTo}
                                onChange={(e) => setTriggerForm(prev => ({ ...prev, data: { ...prev.data, revertStatusTo: e.target.value } }))}
                                className="w-full bg-background border border-primary/20 rounded-md px-3 py-1.5 text-sm outline-none"
                            >
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="TODO">TODO</option>
                                <option value="BLOCKED">BLOCKED</option>
                            </select>
                        </div>
                    )}

                    {triggerForm.type === 'WEBHOOK' && (
                        <div className="space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-primary/70">Webhook URL</label>
                                <input
                                    className="w-full bg-background border border-primary/20 rounded-md px-3 py-1.5 text-sm outline-none"
                                    placeholder="https://..."
                                    value={triggerForm.data.url}
                                    onChange={(e) => setTriggerForm(prev => ({ ...prev, data: { ...prev.data, url: e.target.value } }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-primary/70">Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-background border border-primary/20 rounded-md px-3 py-1.5 text-sm outline-none"
                                    placeholder="Signature secret..."
                                    value={triggerForm.data.secret}
                                    onChange={(e) => setTriggerForm(prev => ({ ...prev, data: { ...prev.data, secret: e.target.value } }))}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

const decodeJWT = (token: string): JWTPayload => JSON.parse(atob(token.split('.')[1]));

function App() {
  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('token');
    if (saved) {
        try {
            decodeJWT(saved);
            return saved;
        } catch {
            localStorage.removeItem('token');
            return null;
        }
    }
    return null;
  });

  const handleLogout = () => {
      localStorage.removeItem('token');
      setToken(null);
  };

  const handleLogin = (newToken: string) => {
      try {
          decodeJWT(newToken);
          localStorage.setItem('token', newToken);
          setToken(newToken);
      } catch (e) {
          console.error('Attempted to login with invalid token', e);
      }
  };

  let user: JWTPayload | null = null;
  if (token) {
      try {
          user = decodeJWT(token);
      } catch {
          // Fallback handled by state initialization
      }
  }

  return (
    <QueryClientProvider client={queryClient}>
        {user ? (
            <Workspace user={user} onLogout={handleLogout} />
        ) : (
            <Auth onLogin={handleLogin} />
        )}
    </QueryClientProvider>
  )
}

export default App
