import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectApi, taskApi, teamApi } from './api/client';
import { ProjectSidebar } from './components/ProjectSidebar';
import { TaskTree } from './components/TaskTree';
import { Project, Task } from './types';
import { Layout, Users, Settings, Plus, Search, Bell } from 'lucide-react';
import { cn } from './utils/cn';

const queryClient = new QueryClient();
const DEMO_USER_ID = 'demo-user';

const Workspace: React.FC = () => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>();
    const qc = useQueryClient();

    // Queries
    const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
        queryKey: ['projects', DEMO_USER_ID],
        queryFn: () => projectApi.getProjects(DEMO_USER_ID),
    });

    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', selectedProjectId],
        queryFn: () => taskApi.getTasks(DEMO_USER_ID, selectedProjectId!),
        enabled: !!selectedProjectId,
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teams', selectedProjectId],
        queryFn: () => teamApi.getTeams(DEMO_USER_ID, selectedProjectId!),
        enabled: !!selectedProjectId,
    });

    // Mutations
    const createTaskMutation = useMutation({
        mutationFn: (data: { title: string; parentTaskId?: string }) => 
            taskApi.createTask({
                userId: DEMO_USER_ID,
                projectId: selectedProjectId!,
                title: data.title,
                description: '',
                initialStatus: 'TODO',
                parentTaskId: data.parentTaskId,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
        },
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: (task: Task) => 
            taskApi.updateTasks(DEMO_USER_ID, selectedProjectId!, [{
                id: task.id,
                version: task.version,
                status: task.status === 'DONE' ? 'TODO' : 'DONE',
            }]),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tasks', selectedProjectId] });
        },
    });

    const createProjectMutation = useMutation({
        mutationFn: (name: string) => 
            projectApi.createProject({ name, userId: DEMO_USER_ID }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['projects', DEMO_USER_ID] });
        },
    });

    // Handlers
    const handleCreateProject = () => {
        const name = prompt('Project name:');
        if (name) createProjectMutation.mutate(name);
    };

    const handleCreateTask = (parentTaskId?: string) => {
        const title = prompt('Task title:');
        if (title) createTaskMutation.mutate({ title, parentTaskId });
    };

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
            <ProjectSidebar 
                projects={projects}
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
                        </div>
                        <div className="h-4 w-px bg-border mx-2" />
                        <nav className="flex items-center gap-1">
                            <button className="px-3 py-1 rounded-md text-sm hover:bg-secondary transition-colors">Tasks</button>
                            <button className="px-3 py-1 rounded-md text-sm text-muted hover:text-foreground hover:bg-secondary transition-colors">Board</button>
                            <button className="px-3 py-1 rounded-md text-sm text-muted hover:text-foreground hover:bg-secondary transition-colors">Teams</button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="bg-secondary/50 border border-transparent focus:border-primary/50 focus:bg-secondary rounded-md py-1.5 pl-9 pr-3 text-xs w-48 transition-all outline-none"
                            />
                        </div>
                        <button className="p-2 hover:bg-secondary rounded-md text-muted hover:text-foreground transition-colors">
                            <Bell size={18} />
                        </button>
                        <button className="p-2 hover:bg-secondary rounded-md text-muted hover:text-foreground transition-colors">
                            <Settings size={18} />
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
                                    onToggleStatus={(task) => updateTaskStatusMutation.mutate(task)}
                                    onCreateSubtask={(id) => handleCreateTask(id)}
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

                    {/* Side Panel (Teams/Members) */}
                    <aside className="w-80 shrink-0 bg-background/30 overflow-y-auto">
                        <div className="p-4 border-b border-border flex items-center gap-2">
                            <Users size={16} className="text-muted" />
                            <h3 className="text-sm font-semibold">Teams & Members</h3>
                        </div>
                        
                        <div className="p-4 space-y-6">
                            {teams.length > 0 ? (
                                teams.map(team => (
                                    <div key={team.id} className="space-y-2">
                                        <div className="flex items-center justify-between group">
                                            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">{team.name}</h4>
                                            <Plus size={12} className="text-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                                        </div>
                                        <div className="space-y-1">
                                            {/* We don't have getTeamMembers in this simple loop yet, but we can show creators */}
                                            <div className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-secondary/50 text-sm">
                                                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-[10px]">
                                                    {team.createdBy.substring(0,2).toUpperCase()}
                                                </div>
                                                <span className="truncate">{team.createdBy}</span>
                                                <span className="text-[10px] bg-secondary px-1 rounded text-muted ml-auto">Lead</span>
                                            </div>
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
        </div>
    );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Workspace />
    </QueryClientProvider>
  )
}

export default App
