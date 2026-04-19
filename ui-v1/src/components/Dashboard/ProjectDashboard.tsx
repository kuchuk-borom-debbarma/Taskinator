import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { ExplorerItem } from './ExplorerItem';
import { 
  Folder, 
  Zap, 
  Activity, 
  Users, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  Loader2,
  ArrowRight,
  Target
} from 'lucide-react';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectApi, teamApi, taskApi } = useApi();
  const [showCreate, setShowCreate] = useState(false);

  // ─── Step 1: Analytical Workspace Stats ────────────────────────────────────
  const { data: workspaceStats } = useQuery({
    queryKey: ['workspace-stats'],
    queryFn: () => projectApi.getWorkspaceStats(),
  });

  // ─── Step 2: Level 1 - Projects ────────────────────────────────────────────
  const {
    data: projectsData,
    fetchNextPage: fetchNextProjects,
    hasNextPage: hasNextProjects,
    isFetchingNextPage: isFetchingProjects,
    isLoading: isLoadingProjects
  } = useInfiniteQuery({
    queryKey: ['explorer-projects'],
    queryFn: ({ pageParam }) => projectApi.getProjects(10, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const projects = projectsData?.pages.flatMap(p => p.projects) || [];

  return (
    <div className="p-8 md:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-12">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-focus-blue">Perspective Explorer</p>
        <h1 className="text-4xl font-black tracking-tight text-text-notion">
          Welcome, <span className="text-focus-blue">{user?.username || 'Architect'}</span>
        </h1>
        <p className="text-text-dim text-sm font-medium opacity-60">System online. Workspace graph hydrated and ready for drill-down.</p>
      </div>

      {/* Analytical Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard 
          label="Active Projects" 
          value={workspaceStats?.projectCount || 0} 
          icon={<Folder size={18} />} 
          color="blue"
          sublabel="Root perspectives"
        />
        <StatCard 
          label="Assigned Tasks" 
          value={workspaceStats?.assignedTaskCount || 0} 
          icon={<Zap size={18} />} 
          color="amber"
          sublabel="Pending DAG nodes"
        />
        <StatCard 
          label="Collaboration" 
          value={workspaceStats?.teamCount || 0} 
          icon={<Users size={18} />} 
          color="emerald"
          sublabel="Sync clusters"
        />
      </div>

      {/* Hierarchical Explorer Section */}
      <div className="glass-card rounded-[32px] border border-white/10 shadow-2xl overflow-hidden bg-white/[0.01]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-focus-blue/10 flex items-center justify-center text-focus-blue">
               <Target size={16} />
             </div>
             <h2 className="text-[14px] font-bold text-text-notion">Project Perspectives</h2>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="p-2 rounded-xl bg-focus-blue/10 text-focus-blue hover:bg-focus-blue hover:text-white transition-all active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="p-4 min-h-[400px]">
          {isLoadingProjects ? (
            <div className="flex items-center justify-center h-64 gap-3 text-text-dim">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Navigating hierarchy...</span>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <ProjectExplorerItem key={project.id} project={project} />
              ))}
              
              {hasNextProjects && (
                <button 
                  onClick={() => fetchNextProjects()}
                  disabled={isFetchingProjects}
                  className="w-full py-3 mt-4 text-[11px] font-bold text-focus-blue bg-focus-blue/5 rounded-xl hover:bg-focus-blue/10 transition-all border border-dashed border-focus-blue/20"
                >
                  {isFetchingProjects ? 'Loading more perspectives...' : 'Discover More Projects'}
                </button>
              )}

              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 py-10 opacity-30 italic text-sm">
                  <p>No projects found in this workspace perspective.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Nested Explorer Logic ──────────────────────────────────────────────────

function ProjectExplorerItem({ project }: { project: any }) {
  const { projectApi, teamApi, taskApi } = useApi();
  const navigate = useNavigate();

  // Fetch stats (counts) for this project
  const { data: stats } = useQuery({
    queryKey: ['project-stats', project.id],
    queryFn: () => projectApi.getProjectStats(project.id),
  });

  const renderChildren = () => (
    <div className="flex flex-col gap-1 py-1">
      {/* 1. Navigate to Project Link */}
      <div 
        onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: project.id } })}
        className="flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-focus-blue hover:bg-focus-blue/5 rounded-xl transition-all cursor-pointer group"
      >
        <ArrowRight size={14} className="-rotate-45" />
        <span>Open Project Dashboard</span>
      </div>

      {/* 2. Teams Drill-down */}
      <DrillDownList 
        label="Project Teams"
        type="team"
        count={stats?.teamCount}
        queryKey={['project-teams', project.id]}
        queryFn={({ pageParam }) => teamApi.getTeams(project.id, 10, pageParam)}
        renderItem={(team) => (
          <TeamExplorerItem key={team.id} team={team} projectId={project.id} />
        )}
      />

      {/* 3. Global Project Tasks Drill-down */}
      <DrillDownList 
        label="Project Tasks"
        type="task"
        count={stats?.taskCount}
        queryKey={['project-tasks-explorer', project.id]}
        queryFn={({ pageParam }) => taskApi.getProjectTasks(project.id, undefined, 10, pageParam)}
        renderItem={(task) => (
          <ExplorerItem 
            key={task.id} 
            id={task.id} 
            label={task.title} 
            type="task" 
            isExpandable={false}
            onSelect={() => navigate({ to: '/projects/$projectId/tasks/$taskId', params: { projectId: project.id, taskId: task.id } })}
          />
        )}
      />
    </div>
  );

  return (
    <ExplorerItem 
      id={project.id} 
      label={project.name} 
      type="project" 
      count={stats?.teamCount}
      renderChildren={renderChildren}
    />
  );
}

function TeamExplorerItem({ team, projectId }: { team: any, projectId: string }) {
  const { taskApi } = useApi();
  const navigate = useNavigate();

  return (
    <ExplorerItem 
      id={team.id} 
      label={team.name} 
      type="team" 
      renderChildren={() => (
        <DrillDownList 
          label="Team Tasks"
          type="task"
          queryKey={['team-tasks-explorer', team.id]}
          queryFn={({ pageParam }) => taskApi.getProjectTasks(projectId, team.id, 10, pageParam)}
          renderItem={(task) => (
            <ExplorerItem 
              key={task.id} 
              id={task.id} 
              label={task.title} 
              type="task" 
              isExpandable={false}
              onSelect={() => navigate({ to: '/projects/$projectId/tasks/$taskId', params: { projectId, taskId: task.id } })}
            />
          )}
        />
      )}
    />
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function DrillDownList({ 
  label, 
  type, 
  count, 
  queryKey, 
  queryFn, 
  renderItem 
}: { 
  label: string, 
  type: 'team' | 'task', 
  count?: number,
  queryKey: any[], 
  queryFn: (params: any) => Promise<any>,
  renderItem: (item: any) => React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey,
    queryFn,
    enabled: isExpanded,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: any) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const listData = data?.pages.flatMap((p: any) => p[type === 'team' ? 'teams' : 'tasks']) || [];

  return (
    <div className="flex flex-col">
       <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-text-dim/60 hover:text-text-notion transition-all cursor-pointer group"
      >
        <span className="group-hover:translate-x-0.5 transition-transform">
          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </span>
        <span>{label}</span>
        {count !== undefined && <span className="text-[9px] opacity-40 ml-1">({count})</span>}
      </div>

      {isExpanded && (
        <div className="ml-4 pl-2 border-l border-white/5 animate-in fade-in duration-300">
          {isLoading ? (
             <div className="py-2 flex items-center gap-2 text-[10px] text-text-dim">
               <Loader2 size={10} className="animate-spin" /> Fetching...
             </div>
          ) : (
            <>
              {listData.map(item => renderItem(item))}
              {hasNextPage && (
                <button 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-1.5 mt-2 text-[10px] font-bold text-focus-blue hover:bg-focus-blue/5 rounded-lg transition-all underline underline-offset-4"
                >
                  {isFetchingNextPage ? '...' : `Show more ${type}s`}
                </button>
              )}
              {listData.length === 0 && (
                <p className="py-2 text-[10px] text-text-dim/30 italic">No {type}s available.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, sublabel, color }: { label: string, value: number, icon: React.ReactNode, sublabel: string, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-focus-blue bg-focus-blue/10',
    amber: 'text-amber-400 bg-amber-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
  };

  return (
    <div className="glass-card p-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 to-transparent hover:border-white/20 transition-all group overflow-hidden relative shadow-premium">
      {/* Background Glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity ${colors[color].split(' ')[1]}`} />
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-dim opacity-50">{label}</span>
            <span className="text-[10px] font-bold text-text-dim/30">{sublabel}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-text-notion tracking-tighter tabular-nums">{value}</span>
          <span className="text-xs font-bold text-incoming">+{(value % 5) + 1}</span>
        </div>
      </div>
    </div>
  );
}
