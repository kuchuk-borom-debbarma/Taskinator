import { Bell, Command, PanelLeft, Search, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface WorkspaceChromeProps {
  children: ReactNode;
}

export function WorkspaceChrome({ children }: WorkspaceChromeProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <img
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=160&q=80"
            alt="Workspace"
          />
          <div>
            <strong>Taskinator</strong>
            <span>Orchestration</span>
          </div>
        </div>

        <button className="search-pill" type="button">
          <Search size={16} />
          Search work
          <kbd>Cmd K</kbd>
        </button>

        <nav className="nav-list" aria-label="Workspace">
          <a className="active" href="/projects/alpha/tasks/task-000/views/trail?page=0">
            <PanelLeft size={16} />
            Task trail
          </a>
          <a href="/projects/alpha/tasks/task-000/views/trail?page=0">
            <Command size={16} />
            Command center
          </a>
          <a href="/projects/alpha/tasks/task-000/views/trail?page=0">
            <Sparkles size={16} />
            Automations
          </a>
        </nav>

        <section className="sidebar-note">
          <span>Loaded softly</span>
          <p>Pages near your focus stay warm. Older pages leave memory as you move.</p>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Project Alpha</p>
            <h1>Task trail</h1>
          </div>
          <button className="icon-button" type="button" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}
