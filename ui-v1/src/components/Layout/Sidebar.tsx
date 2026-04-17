import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { Link } from '@tanstack/react-router';
import { FolderKanban, LayoutDashboard, Settings } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { projectApi } = useApi();
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getProjects(),
  });

  return (
    <aside className="w-60 h-screen bg-bg-secondary border-r border-border-notion flex flex-col py-3 overflow-y-auto shrink-0">
      <div className="px-4 pb-5 font-semibold text-text-notion">
        Taskinator
      </div>

      <nav className="flex-1">
        <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <SidebarItem to="/" icon={<FolderKanban size={18} />} label="All Projects" />
        
        <div className="px-4 pt-6 pb-2 text-[11px] font-semibold text-text-dim uppercase tracking-wider">
          Workspace
        </div>
        
        {projects?.projects?.map(p => (
          <SidebarItem 
            key={p.id} 
            to="/projects/$projectId" 
            params={{ projectId: p.id }}
            label={p.name} 
          />
        ))}
      </nav>

      <div className="pt-3 border-t border-border-notion mt-auto">
        <SidebarItem to="/" label="Settings" icon={<Settings size={18} />} />
      </div>
    </aside>
  );
};

const SidebarItem: React.FC<{ to: string, icon?: React.ReactNode, label: string, params?: any }> = ({ to, icon, label, params }) => (
  <Link 
    to={to as any} 
    params={params}
    className="px-4 py-1.5 flex items-center gap-2.5 text-sm text-text-notion hover:bg-black/5 transition-colors duration-200"
    activeProps={{ className: 'bg-black/10 font-medium' }}
  >
    {icon && <span className="opacity-70">{icon}</span>}
    <span className="truncate">{label}</span>
  </Link>
);
