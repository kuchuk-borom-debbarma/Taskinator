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
    <div className="sidebar" style={{
      width: '240px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 0',
    }}>
      <div style={{ padding: '0 16px 20px', fontWeight: 600, color: 'var(--text-primary)' }}>
        Taskinator
      </div>

      <nav style={{ flex: 1 }}>
        <SidebarItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <SidebarItem to="/projects" icon={<FolderKanban size={18} />} label="All Projects" />
        
        <div style={{ padding: '24px 16px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Workspace
        </div>
        
        {projects?.map(p => (
          <SidebarItem 
            key={p.id} 
            to="/projects/$projectId" 
            params={{ projectId: p.id }}
            label={p.name} 
          />
        ))}
      </nav>

      <div style={{ padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
        <SidebarItem to="/" label="Settings" icon={<Settings size={18} />} />
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ to: string, icon?: React.ReactNode, label: string, params?: any }> = ({ to, icon, label, params }) => (
  <Link 
    to={to as any} 
    params={params}
    style={{
      padding: '6px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      color: 'var(--text-primary)',
      transition: 'background 0.2s',
    }}
    activeProps={{ style: { backgroundColor: 'var(--border-subtle)', fontWeight: 500 } }}
  >
    {icon}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
  </Link>
);
