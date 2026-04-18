import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { Link, useLocation } from '@tanstack/react-router';
import { 
  FolderKanban, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  User, 
  Plus, 
  Search, 
  ChevronDown,
  Command,
  Hash
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { projectApi } = useApi();
  const { logout, user } = useAuth();
  const location = useLocation();
  
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getProjects(),
  });

  return (
    <aside className="w-68 h-screen bg-[#09090b] border-r border-[#1e1e21] flex flex-col shadow-2xl overflow-hidden shrink-0 select-none">
      {/* Workspace Header */}
      <div className="p-4 flex items-center justify-between group cursor-pointer hover:bg-white/[0.03] transition-colors border-b border-[#1e1e21]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-focus-blue rounded-md flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-focus-blue/20">
            T
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-tight leading-none mb-0.5">Taskinator Workspace</span>
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest leading-none">Pro Edition</span>
          </div>
        </div>
        <ChevronDown size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>

      {/* Global Actions */}
      <div className="px-3 pt-4 space-y-0.5">
        <button className="w-full flex items-center justify-between px-3 py-2 text-white/40 hover:text-white/70 hover:bg-white/[0.03] rounded-lg transition-all text-xs font-medium group">
          <div className="flex items-center gap-2.5">
            <Search size={14} />
            <span>Search</span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold">⌘</span>
            <span className="px-1 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold">K</span>
          </div>
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 text-white/40 hover:text-white/70 hover:bg-white/[0.03] rounded-lg transition-all text-xs font-medium">
          <Plus size={14} />
          <span>New Project</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-6 space-y-0.5 overflow-y-auto scrollbar-hide">
        <SidebarItem to="/" icon={<LayoutDashboard size={14} />} label="Dashboard" active={location.pathname === '/'} />
        <SidebarItem to="/" icon={<FolderKanban size={14} />} label="All Projects" />
        
        <div className="px-3 pt-8 pb-2 flex items-center justify-between group">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Workspace</span>
          <Plus size={12} className="text-white/0 group-hover:text-white/20 cursor-pointer hover:text-white/40 transition-all" />
        </div>
        
        <div className="space-y-0.5">
          {projects?.projects?.map(p => (
            <SidebarItem 
              key={p.id} 
              to="/projects/$projectId" 
              params={{ projectId: p.id }}
              label={p.name} 
              icon={<Hash size={14} className="text-white/20 group-hover:text-white/40 transition-colors" />}
              active={location.pathname.includes(`/projects/${p.id}`)}
            />
          ))}
        </div>
      </nav>

      {/* User Footer Section */}
      <div className="mt-auto p-3 border-t border-[#1e1e21]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 p-2 hover:bg-white/[0.03] rounded-xl transition-colors group cursor-default">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-focus-blue/20 to-purple-500/10 border border-white/5 flex items-center justify-center text-focus-blue overflow-hidden shadow-inner">
              <User size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white/80 leading-none mb-1 truncate">{user?.username || 'Guest Administrator'}</p>
              <p className="text-[10px] font-medium text-white/20 truncate tracking-wide">{user?.email || 'admin@taskinator.io'}</p>
            </div>
            <Settings size={14} className="text-white/10 group-hover:text-white/40 cursor-pointer transition-colors" />
          </div>

          <button 
            onClick={() => logout()}
            className="w-full mt-1 px-3 py-2.5 flex items-center gap-2.5 text-[11px] font-bold text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all duration-300 group"
          >
            <div className="w-6 h-6 rounded-md bg-red-400/0 group-hover:bg-red-500/10 flex items-center justify-center transition-all">
              <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            <span className="uppercase tracking-widest">Terminate Session</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const SidebarItem: React.FC<{ 
  to: string, 
  icon?: React.ReactNode, 
  label: string, 
  params?: any,
  active?: boolean 
}> = ({ to, icon, label, params, active }) => (
  <Link 
    to={to as any} 
    params={params}
    className={`group px-3 py-1.5 flex items-center gap-2.5 text-[13px] font-medium rounded-lg transition-all duration-200 border border-transparent ${
      active 
        ? 'bg-white/[0.05] text-white border-white/5 shadow-inner' 
        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
    }`}
  >
    {icon && <span className={`shrink-0 ${active ? 'text-focus-blue' : 'opacity-40 group-hover:opacity-70'} transition-opacity`}>{icon}</span>}
    <span className="truncate tracking-tight">{label}</span>
  </Link>
);
