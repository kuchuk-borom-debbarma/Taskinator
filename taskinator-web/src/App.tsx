import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectApi, taskApi, teamApi } from './api/client';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TaskTree } from './components/TaskTree';
import { Drawer } from './components/Drawer';
import { MemberManager } from './components/MemberManager';
import { Layout, Users, Settings, Plus, Search, Bell, Trash2, FolderEdit, CheckCircle2, Circle, AlignLeft, Users2, User as UserIcon } from 'lucide-react';
import { cn } from './utils/cn';
import { Auth } from './components/Auth';
import type { JWTPayload } from './types';

const queryClient = new QueryClient();

interface WorkspaceProps {
    user: JWTPayload;
    onLogout: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ user, onLogout }) => {
    const userId = user.id;
    const [selectedProjectId, setSelectedProjectId] = useState<string>();
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const qc = useQueryClient();

    // Queries
    const { data: projects = [] } = useQuery({
        queryKey: ['projects', userId],
        queryFn: () => projectApi.getProjects(userId.trim()),
        enabled: !!userId.trim(),
    });

    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', selectedProjectId, userId],
        queryFn: () => taskApi.getTasks(userId.trim(), selectedProjectId!),
        enabled: !!selectedProjectId && !!userId.trim(),
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teams', selectedProjectId, userId],
        queryFn: () => teamApi.getTeams(userId.trim(), selectedProjectId!),
        enabled: !!selectedProjectId && !!userId.trim(),
    });

    const { data: projectMembers = [] } = useQuery({
        queryKey: ['project-members', selectedProjectId, userId],
        queryFn: () => projectApi.getProjectMembers(userId.trim(), selectedProjectId!),
        enabled: isProjectSettingsOpen && !!selectedProjectId && !!userId.trim(),
    });

    const { data: teamMembers = [] } = useQuery({
        queryKey: ['team-members', selectedProjectId, selectedTeamId],
        queryFn: () => teamApi.getTeamMembers(userId.trim(), selectedProjectId!, selectedTeamId!),
        enabled: !!selectedTeamId && !!selectedProjectId && !!userId.trim(),
    });

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: (data: { title: string; parentTaskId?: string }) => 
            taskApi.createTask({
                userId: userId.trim(),
                projectId: selectedProjectId!,
                title: data.title,
                description: '',
                initialStatus: 'TODO',
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
        mutationFn: (name: string) => projectApi.createProject({ name, userId: userId.trim() }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', userId] }),
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (id: string) => projectApi.deleteProjects(userId.trim(), [id]),
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
        const name = prompt('Project name:');
        if (name) createProjectMutation.mutate(name);
    };

    const handleCreateTeam = () => {
        if (!selectedProjectId) return;
        const name = prompt('Team name:');
        if (name) createTeamMutation.mutate(name);
    };

    const handleCreateTask = (parentTaskId?: string) => {
        const title = prompt('Task title:');
        if (title) createTaskMutation.mutate({ title, parentTaskId });
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const selectedTask = tasks.find(t => t.id === selectedTaskId);

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
                <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Layout size={16} className="text-muted" />
                            <span>{selectedProject?.name || 'Select a project'}</span>
                            {selectedProjectId && (
                                <button 
                                    onClick={() => setIsProjectSettingsOpen(true)}
                                    className="p-1 hover:bg-secondary rounded text-muted transition-colors"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                        </div>
                        <div className="h-4 w-px bg-border mx-2" />
                        <nav className="flex items-center gap-1">
                            <button className="px-3 py-1 rounded-md text-sm hover:bg-secondary transition-colors">Tasks</button>
                            <button className="px-3 py-1 rounded-md text-sm text-muted hover:text-foreground hover:bg-secondary transition-colors">Board</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="bg-secondary/50 border border-transparent focus:border-primary/50 focus:bg-secondary rounded-md py-1.5 pl-9 pr-3 text-xs w-48 transition-all outline-none"
                                autoComplete="off"
                                data-1p-ignore
                                data-lpignore="true"
                            />
                        </div>
                        <button className="p-2 hover:bg-secondary rounded-md text-muted hover:text-foreground transition-colors">
                            <Bell size={18} />
                        </button>
                    </div>
                </header>

                {/* Workspace Content */}
                <div className="flex-1 flex min-h-0">
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden">
                        <div className="p-4 border-b border-border flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
                            <h2 className="text-lg font-semibold">Workspace</h2>
                            <button 
                                onClick={() => handleCreateTask()}
                                disabled={!selectedProjectId}
                                className="bg-primary hover:bg-primary/90 text-white text-sm px-3 py-1.5 rounded-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/20"
                            >
                                <Plus size={16} />
                                New Task
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {selectedProjectId ? (
                                <TaskTree 
                                    tasks={tasks} 
                                    onToggleStatus={(task) => updateTaskMutation.mutate({ id: task.id, version: task.version, status: task.status === 'DONE' ? 'TODO' : 'DONE' })}
                                    onCreateSubtask={(id) => handleCreateTask(id)}
                                    onClickTask={(task) => setSelectedTaskId(task.id)}
                                    onDeleteTask={(id) => deleteTasksMutation.mutate([id])}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                                        <Layout size={32} />
                                    </div>
                                    <p className="text-sm">Select a project to start managing tasks</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Side Panel (Teams) */}
                    <aside className="w-80 shrink-0 bg-background/30 overflow-y-auto">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-muted" />
                                <h3 className="text-sm font-semibold">Teams</h3>
                            </div>
                            <button 
                                onClick={handleCreateTeam}
                                disabled={!selectedProjectId}
                                className="p-1 hover:bg-secondary rounded-md text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-6">
                            {teams.length > 0 ? (
                                teams.map(team => (
                                    <div 
                                        key={team.id} 
                                        onClick={() => setSelectedTeamId(team.id)}
                                        className={cn(
                                            "space-y-2 p-2 rounded-lg cursor-pointer transition-all",
                                            selectedTeamId === team.id ? "bg-secondary" : "hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between group">
                                            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">{team.name}</h4>
                                            <Settings size={12} className="text-muted opacity-0 group-hover:opacity-100" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted">
                                            <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center text-[8px] font-bold">
                                                {team.createdBy.substring(0,2).toUpperCase()}
                                            </div>
                                            <span>Created by {team.createdBy}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-xs text-muted">No teams found</p>
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
                                if (confirm('Are you sure? This will delete all teams and tasks.')) {
                                    deleteProjectMutation.mutate(selectedProjectId!);
                                }
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
                    />

                    <div className="pt-4 border-t border-border">
                        <button 
                            onClick={() => {
                                if (confirm('Delete this team?')) {
                                    deleteTeamMutation.mutate(selectedTeamId!);
                                }
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
                                <input 
                                    type="text"
                                    defaultValue={selectedTask.memberId || ''}
                                    onBlur={(e) => {
                                        if (e.target.value !== (selectedTask.memberId || '')) {
                                            updateTaskMutation.mutate({ id: selectedTask.id, version: selectedTask.version, memberId: e.target.value || null });
                                        }
                                    }}
                                    placeholder="User ID"
                                    className="w-full bg-secondary/30 border border-border rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary/50"
                                    autoComplete="off"
                                    data-1p-ignore
                                    data-lpignore="true"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border">
                            <button 
                                onClick={() => {
                                    if (confirm('Delete this task?')) {
                                        deleteTasksMutation.mutate([selectedTask.id]);
                                    }
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
