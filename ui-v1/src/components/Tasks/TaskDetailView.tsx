import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { NeuralLattice } from '../Graph/NeuralLattice';
import { ChevronLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface TaskDetailViewProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onClose }) => {
  const { taskApi } = useApi();

  const { data: task, isLoading: isTaskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
  });

  const { data: neighbourhood, isLoading: isNeighbourLoading } = useQuery({
    queryKey: ['neighbourhood', taskId],
    queryFn: () => taskApi.getTaskNeighbourhood(taskId),
  });

  if (isTaskLoading || isNeighbourLoading || !task) {
    return (
      <div style={{ padding: '80px 100px', color: 'var(--text-secondary)' }}>
        Loading Task Details...
      </div>
    );
  }

  const incomingLinks = neighbourhood?.edges.filter(e => e.targetTaskId === taskId) || [];
  const outgoingLinks = neighbourhood?.edges.filter(e => e.sourceTaskId === taskId) || [];

  return (
    <div className="task-detail-container" style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowX: 'hidden'
    }}>
      <div className="task-detail-content" style={{
        width: '100%',
        maxWidth: '1200px',
        padding: '40px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}>
        <nav>
          <button 
            onClick={onClose} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '6px',
              marginLeft: '-12px',
              transition: 'background 0.2s'
            }}
            className="back-button"
          >
            <ChevronLeft size={18} />
            Back to list
          </button>
        </nav>

        <header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontSize: '11px', 
              fontWeight: 700, 
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {task.status}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Ref: {task.id.toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {task.title}
          </h1>
        </header>

        {/* Modular Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '48px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            
            {/* Dependency Bilateral View */}
            <section>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                Direct Dependencies
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Incoming (Left) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ArrowDownLeft size={12} /> Incoming
                  </span>
                  {incomingLinks.length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>No incoming links.</div>
                  )}
                  {incomingLinks.map(edge => (
                    <DependencyLink key={edge.id} edge={edge} taskId={taskId} direction="incoming" neighbourhood={neighbourhood!} />
                  ))}
                </div>

                {/* Outgoing (Right) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Outgoing <ArrowUpRight size={12} />
                  </span>
                  {outgoingLinks.length === 0 && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '12px', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>No outgoing links.</div>
                  )}
                  {outgoingLinks.map(edge => (
                    <DependencyLink key={edge.id} edge={edge} taskId={taskId} direction="outgoing" neighbourhood={neighbourhood!} />
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Neural Lattice
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Perspective Discovery</span>
              </div>
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
                {neighbourhood && <NeuralLattice neighbourhood={neighbourhood} />}
              </div>
            </section>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '40px', position: 'sticky', top: '40px' }}>
            <section>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                Summary
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {task.description || "No description provided."}
              </p>
            </section>

            <section>
              <h3 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                Metadata
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                <MetadataRow label="Created" value={new Date(task.createdAt).toLocaleDateString()} />
                <MetadataRow label="Updated" value={new Date(task.updatedAt).toLocaleDateString()} />
                <MetadataRow label="Version" value={`v${task.version}`} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        .back-button:hover { background-color: var(--bg-secondary); }
        .dependency-item:hover { border-color: var(--border-focus); background-color: var(--bg-primary); }
      `}</style>
    </div>
  );
};

const DependencyLink: React.FC<{ edge: any, direction: 'incoming' | 'outgoing', neighbourhood: any }> = ({ edge, direction, neighbourhood }) => {
  const otherId = direction === 'outgoing' ? edge.targetTaskId : edge.sourceTaskId;
  const otherTask = neighbourhood.nodes.find((n: any) => n.task.id === otherId)?.task;

  if (!otherTask) return null;

  return (
    <Link 
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: otherTask.projectId, taskId: otherId }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
        fontSize: '13px',
        transition: 'all 0.2s',
      }}
      className="dependency-item"
    >
      <span style={{ fontWeight: 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{otherTask.title}</span>
      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'rgba(55,53,47,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
        {edge.label}
      </span>
    </Link>
  );
};

const MetadataRow: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontWeight: 500 }}>{value}</span>
  </div>
);
