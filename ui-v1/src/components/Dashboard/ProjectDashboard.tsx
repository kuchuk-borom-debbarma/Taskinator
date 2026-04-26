import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { CreateProjectModal } from '../Layout/Sidebar';
import { 
  Plus, 
  Loader2,
  ArrowRight,
  Layout,
  PanelLeft
} from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projectApi } = useApi();
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const [showCreate, setShowCreate] = useState(false);

  // ─── Project List ──────────────────────────────────────────────────────────
  const {
    data: projectsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['workspace-projects-list'],
    queryFn: ({ pageParam }) => projectApi.getProjects(10, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNextPage ? lastPage.endCursor : undefined,
  });

  const projects = projectsData?.pages.flatMap(p => p.projects) || [];

  return (
    <div className="p-8 md:p-10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-2 mb-12">
        <div className="flex items-center gap-4 mb-2">
          {isSidebarCollapsed && (
            <button 
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Expand Sidebar"
            >
              <PanelLeft size={20} />
            </button>
          )}
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-focus-blue">Workspace Dashboard</p>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-text-notion">
          Welcome, <span className="text-focus-blue">{user?.username || 'Architect'}</span>
        </h1>
      </div>

      {/* Project Selection Section */}
      <div className="glass-card rounded-[32px] border border-white/10 shadow-2xl overflow-hidden bg-white/[0.01]">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-focus-blue/10 flex items-center justify-center text-focus-blue">
               <Layout size={16} />
             </div>
             <h2 className="text-[14px] font-bold text-text-notion">Your Projects</h2>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="p-2 rounded-xl bg-focus-blue/10 text-focus-blue hover:bg-focus-blue hover:text-white transition-all active:scale-95"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="p-4 min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 gap-3 text-text-dim">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-medium">Loading workspace...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {projects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => navigate({ to: '/projects/$projectId', params: { projectId: project.id } })}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-bold text-text-notion group-hover:text-focus-blue transition-colors">{project.name}</h3>
                    <p className="text-xs text-text-dim opacity-60 leading-relaxed max-w-md line-clamp-1">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-black text-text-dim/20 uppercase tracking-widest hidden sm:block">
                      v{project.version}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-dim opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
              
              {hasNextPage && (
                <button 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-4 mt-4 text-[11px] font-bold text-focus-blue bg-focus-blue/5 rounded-2xl hover:bg-focus-blue/10 transition-all border border-dashed border-focus-blue/20"
                >
                  {isFetchingNextPage ? 'Loading more projects...' : 'View More Projects'}
                </button>
              )}

              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 py-10 opacity-30 italic text-sm text-text-dim">
                  <p>No projects found in this workspace context.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
