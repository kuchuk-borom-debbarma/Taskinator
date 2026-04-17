import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Layout, ChevronRight, Zap, Network, Layers, GitBranch, Server, Database, Cpu, Code, Shield } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { gqlClient } from '../../graphql/client';
import { GET_PROJECTS } from '../../graphql/operations';
import { useSlidingWindow } from '../../hooks/useSlidingWindow';
import { useUIStore } from '../../store/ui';

interface Project {
  id: string;
  name: string;
  creator?: { username: string };
  description?: string;
}

interface ProjectDashboardProps {
  userId: string;
  username: string;
}

const ProjectCard: React.FC<{ project: Project; onClick: () => void }> = ({ project, onClick }) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group cursor-pointer relative glass p-6 rounded-[32px] border border-white/5 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between h-[220px]"
    >
      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-2 bg-primary/10 rounded-full text-primary">
          <ChevronRight size={16} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 flex items-center justify-center border border-white/5 shadow-inner">
          <Layout size={24} className="text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2 leading-relaxed">
            {project.description || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full border-2 border-[#0d0d0d] bg-secondary flex items-center justify-center text-[8px] font-bold">
             {project.creator?.username?.substring(0, 1).toUpperCase() || '?'}
           </div>
           <span className="text-[10px] font-bold text-muted-foreground/40 tracking-widest">
             Owner: {project.creator?.username || 'Unknown'}
           </span>
        </div>
      </div>
    </motion.div>
  );
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  userId,
  username,
}) => {
  const navigate = useNavigate();
  const setActiveModal = useUIStore(state => state.setActiveModal);

  // Initial projects fetch
  const { data, isLoading } = useQuery({
    queryKey: ['projects', userId, 'dashboard-initial'],
    queryFn: () => gqlClient.request<any>(GET_PROJECTS, { first: 12 }),
    enabled: !!userId,
  });

  const connection = useMemo(() => 
    data?.projects || { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } }
  , [data]);

  const fetchMore = async (params: any) => {
    const res = await gqlClient.request<any>(GET_PROJECTS, params);
    return res.projects;
  };

  const {
    items: projects,
    containerRef,
    topSentinelRef,
    bottomSentinelRef,
    isLoadingNext,
    isLoadingPrev
  } = useSlidingWindow<Project>({
    initialData: connection,
    fetchMore,
    pageSize: 12,
    maxWindowSize: 36
  });

  return (
    <div 
        ref={containerRef}
        className="flex-1 w-full max-w-7xl mx-auto px-10 py-12 overflow-y-auto custom-scrollbar relative"
    >
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight flex flex-wrap items-baseline gap-x-3">
            <span className="text-foreground/90">Welcome back,</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400 truncate max-w-full lg:max-w-[400px]" title={username}>
               {username}
            </span>
          </h1>
          <div className="space-y-1">
             <p className="text-base text-foreground/80 font-medium">
                Taskinator is your central workspace for organizing complex projects, orchestrating teams, and keeping everyone strictly aligned.
             </p>
             <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
                You have <span className="text-primary">{connection.totalCount || projects.length}</span> Project{projects.length === 1 ? '' : 's'} surfacing in your window.
             </p>
          </div>
        </div>
        
        <button
          onClick={() => setActiveModal('CREATE_PROJECT')}
          className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-white text-background text-[13px] font-bold hover:bg-white/90 transition-all shadow-2xl shadow-white/10 active:scale-95 shrink-0"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Project
        </button>
      </header>

      {/* Top Sentinel */}
      <div ref={topSentinelRef} className="h-10 flex items-center justify-center">
            {isLoadingPrev && <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
      </div>

      {projects.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-10 w-full max-w-4xl mx-auto">
           <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center border-4 border-background shadow-2xl relative z-10 shadow-primary/20">
                 <Layout size={40} className="text-white fill-white/10" />
              </div>
           </div>

           <h2 className="text-5xl font-black tracking-tight text-center mb-6">Unleash <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">Taskinator</span></h2>
           <p className="text-lg text-muted-foreground/80 text-center max-w-2xl leading-relaxed mb-16">
             The ultimate task management suite built for high-performing teams. Transform chaotic workloads into clear, trackable steps.
           </p>

           <button
              onClick={() => setActiveModal('CREATE_PROJECT')}
              className="px-10 py-4 mb-20 rounded-full bg-primary text-white text-[15px] font-black hover:bg-indigo-500 transition-all shadow-[0_10px_40px_rgba(99,102,241,0.3)] hover:-translate-y-1 hover:scale-105 active:scale-95 flex items-center gap-3"
           >
              <Plus size={20} strokeWidth={3} />
              Forge Your First Project
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {projects.map((project: Project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate({ to: '/project/$projectId/tasks', params: { projectId: project.id } })}
            />
          ))}
        </div>
      )}

      {/* Bottom Sentinel */}
      <div ref={bottomSentinelRef} className="h-20 flex items-center justify-center">
            {isLoadingNext && <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
      </div>

      {/* Feature Overview (Visible when scrolled down) */}
      <div className="mt-20 pt-16 border-t border-white/5">
        <h3 className="text-2xl font-black tracking-tight mb-8">Taskinator Advantage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full pb-16">
           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-5">
                 <Layers size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Clear Organization</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Break down massive projects into focused, bite-sized tasks with an elegant interface. Eliminate dashboard clutter.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-5">
                 <Zap size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Smart Automations</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Automate workflows using task triggers. Ping external <b>Webhooks</b>, <b>Block Parent Tasks</b> until done, or auto-notify teams.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-5">
                 <Layout size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Real-Time Sync</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Work seamlessly alongside your team. Every task status update synchronizes instantly to everyone's screen.</p>
           </div>

           <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col hover:border-primary/20 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-5">
                 <Network size={24} />
              </div>
              <h3 className="font-bold text-[15px] mb-2">Team Coordination</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Group members together into dedicated teams to easily delegate objectives and distribute workforce effectively.</p>
           </div>
        </div>
      </div>

      {/* For Developers / Technical Architecture */}
      <div className="mt-8 pt-16 border-t border-white/5 pb-20">
        <div className="flex flex-col md:flex-row gap-12 items-start justify-between">
            <div className="md:w-1/3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">
                 <Code size={12} /> Under the hood
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-4">Architecture.</h3>
              <p className="text-sm text-muted-foreground/80 leading-relaxed mb-8">
                 Taskinator is built on a modular monolith with an emphasis on data integrity, event-driven patterns, and high throughput.
              </p>
              <a 
                 href="https://github.com/kuchuk-borom-debbarma/Taskinator" 
                 target="_blank" 
                 rel="noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold transition-all hover:border-white/20"
              >
                 <GitBranch size={18} />
                 Open Source on GitHub
              </a>
            </div>

            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
               {/* Architecture Cards remain identical as they are static */}
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl w-max"><Zap size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Event-Driven Pattern</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">A decoupled message bus powered by Kafka. Domains communicate entirely via asynchronous pub/sub events.</p>
                  </div>
               </div>
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-max"><Database size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Transactional Outbox</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">Prevents dual-write failures. Domain mutations and outgoing events are persisted atomically to guarantee exactly-once delivery.</p>
                  </div>
               </div>
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-xl w-max"><Server size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Batched Mutations</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">Optimized for high-throughput writes. Uses database-level batching and 2-call validation buffers to handle mass requests.</p>
                  </div>
               </div>
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-max"><Network size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Hierarchical Data</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">Uses combination of Closure Tables and Materialized Paths in Postgres to ensure O(1) read performance for deep hierarchies.</p>
                  </div>
               </div>
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl w-max"><Cpu size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Apollo DataLoaders</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">Eliminates N+1 relational bottlenecks via batched GraphQL DataLoaders, utilizing deterministic tie-breakers for cursor pagination.</p>
                  </div>
               </div>
               <div className="glass p-6 rounded-2xl border border-white/5 hover:border-primary/20 transition-all flex flex-col gap-3">
                  <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl w-max"><Shield size={18} /></div>
                  <div>
                     <h4 className="font-bold text-[13px] mb-1">Optimistic Concurrency</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">Maintains distributed data integrity using version-based optimistic locking and strict UTC timelines across the data layer.</p>
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
