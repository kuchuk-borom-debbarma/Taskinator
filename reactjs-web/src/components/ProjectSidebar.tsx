import { FolderKanban, LogOut, Plus, Users } from 'lucide-react';
import type { Project, Team } from '../types';

export function ProjectSidebar({
  username,
  projects,
  teams,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onCreateTeam,
  onLogout,
}: {
  username: string;
  projects: Project[];
  teams: Team[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onCreateTeam: () => void;
  onLogout: () => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand-row">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=160&q=80"
          alt="Workspace"
        />
        <div>
          <strong>Taskinator</strong>
          <span>{username}</span>
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="search-pill" type="button" onClick={onCreateProject}>
          <Plus size={15} />
          New project
        </button>
        <button className="search-pill" type="button" onClick={onCreateTeam} disabled={!selectedProjectId}>
          <Users size={15} />
          New team
        </button>
      </div>

      <div className="side-section">
        <div className="side-section-header">
          <FolderKanban size={15} />
          Projects
        </div>
        <div className="nav-list">
          {projects.map((project) => (
            <button
              key={project.id}
              className={project.id === selectedProjectId ? 'nav-item active' : 'nav-item'}
              type="button"
              onClick={() => onSelectProject(project.id)}
            >
              <strong>{project.name}</strong>
              <span>{project.description || 'No description yet'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="side-section">
        <div className="side-section-header">
          <Users size={15} />
          Teams
        </div>
        <div className="team-stack">
          {teams.length === 0 ? <p className="quiet">No teams in this project.</p> : null}
          {teams.map((team) => (
            <div className="team-chip" key={team.id}>{team.name}</div>
          ))}
        </div>
      </div>

      <button className="logout-button" type="button" onClick={onLogout}>
        <LogOut size={15} />
        Logout
      </button>
    </aside>
  );
}
