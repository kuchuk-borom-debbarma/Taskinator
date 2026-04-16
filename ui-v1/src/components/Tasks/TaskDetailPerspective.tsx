import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../context/ApiContext';
import { NeuralLattice } from '../Graph/NeuralLattice';
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface TaskDetailPerspectiveProps {
  taskId: string;
  onClose: () => void;
}

export const TaskDetailPerspective: React.FC<TaskDetailPerspectiveProps> = ({ taskId, onClose }) => {
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
    return <div className="perspective-overlay glass" style={{
      position: 'fixed', right: 0, top: 0, width: '600px', height: '100vh', padding: '100px', zIndex: 100
    }}>Loading Perspective...</div>;
  }

  return (
    <div className="perspective-overlay glass" style={{
      position: 'fixed',
      right: 0,
      top: 0,
      width: '60% ',
      height: '100vh',
      padding: '40px',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
      borderLeft: '1px solid var(--border-subtle)',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ 
            padding: '3px 8px', 
            borderRadius: '4px', 
            fontSize: '12px', 
            fontWeight: 600, 
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)'
          }}>
            {task.status}
          </span>
          <h1 style={{ fontSize: '28px', marginTop: '12px', fontWeight: 700 }}>{task.title}</h1>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
          <X size={24} />
        </button>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <section>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</span>
          <p style={{ marginTop: '8px', fontSize: '15px', color: 'var(--text-primary)' }}>{task.description}</p>
        </section>

        <section>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Direct Dependencies</span>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {neighbourhood?.edges.filter(e => e.sourceTaskId === taskId || e.targetTaskId === taskId).length === 0 && (
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No direct dependencies.</div>
            )}
            {neighbourhood?.edges.map(edge => {
              const isOutgoing = edge.sourceTaskId === taskId;
              const otherId = isOutgoing ? edge.targetTaskId : edge.sourceTaskId;
              const otherTask = neighbourhood.nodes.find(n => n.task.id === otherId)?.task;

              if (!otherTask) return null;

              return (
                <Link 
                  key={edge.id}
                  to="/projects/$projectId/tasks/$taskId"
                  params={{ projectId: task.projectId, taskId: otherId }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '14px'
                  }}
                >
                  {isOutgoing ? <ArrowUpRight size={14} color="var(--accent-outgoing)" /> : <ArrowDownLeft size={14} color="var(--accent-incoming)" />}
                  <span style={{ fontWeight: 500 }}>{otherTask.title}</span>
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', marginLeft: 'auto' }}>
                    {edge.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Neural Lattice</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Infinite Discovery Graph</span>
          </div>
          {neighbourhood && <NeuralLattice neighbourhood={neighbourhood} />}
        </section>
      </div>
    </div>
  );
};
