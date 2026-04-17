import React, { useState, useMemo } from 'react';
import { Search, Link, X } from 'lucide-react';
import { RelationshipPill } from './RelationshipPill';
import type { Task } from '../types';

interface RelationshipCreatorProps {
  tasks: Task[];
  currentTaskId: string;
  onLink: (toTaskId: string, label: string) => void;
  onCancel?: () => void;
}

/**
 * A specialized UI for creating task relationships.
 * Allows searching for existing tasks and assigning a semantic link label.
 */
export const RelationshipCreator: React.FC<RelationshipCreatorProps> = ({
  tasks,
  currentTaskId,
  onLink,
  onCancel
}) => {
  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Filter out the current task and anything that doesn't match the search
  const availableTasks = useMemo(() => {
    return tasks.filter(t => 
      t.id !== currentTaskId && 
      (t.title.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search))
    ).slice(0, 5); // Limit to top 5 matches
  }, [tasks, currentTaskId, search]);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const handleSubmit = () => {
    if (selectedTaskId && label.trim()) {
      onLink(selectedTaskId, label.trim());
      setSearch('');
      setLabel('');
      setSelectedTaskId(null);
    }
  };

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">Forge New Link</h4>
            {onCancel && (
                <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-lg text-muted-foreground">
                    <X size={14} />
                </button>
            )}
        </div>

        {!selectedTaskId ? (
            <div className="space-y-3">
                <div className="relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input 
                        type="text"
                        placeholder="Search target task..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-sm focus:border-primary/40 outline-none transition-all"
                    />
                </div>
                
                <div className="space-y-2">
                    {availableTasks.map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setSelectedTaskId(t.id)}
                            className="w-full p-3 rounded-xl hover:bg-white/5 transition-all text-left text-xs font-bold border border-transparent hover:border-white/5"
                        >
                            {t.title}
                        </button>
                    ))}
                    {search && availableTasks.length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground/40">No matching tasks found</div>
                    )}
                </div>
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-black text-primary/60">Target Task</span>
                        <span className="text-sm font-bold truncate max-w-[200px]">{selectedTask?.title}</span>
                    </div>
                    <button onClick={() => setSelectedTaskId(null)} className="p-1 text-muted-foreground hover:text-white">
                        <X size={14} />
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase pl-1 block mb-1">Relationship Label (e.g. Blocks)</label>
                    <div className="flex gap-2">
                        <input 
                            autoFocus
                            type="text"
                            maxLength={50}
                            placeholder="Type label..."
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2 text-sm focus:border-primary/40 outline-none transition-all"
                        />
                        <button 
                            disabled={!label.trim()}
                            onClick={handleSubmit}
                            className="bg-primary hover:bg-indigo-500 disabled:opacity-30 text-white p-2 px-4 rounded-xl transition-all"
                        >
                            <Link size={18} />
                        </button>
                    </div>
                    <div className="flex gap-2 flex-wrap pt-2">
                         {['Sub-task', 'Parent', 'Blocks', 'Relates to'].map(suggestion => (
                             <RelationshipPill 
                                key={suggestion}
                                label={suggestion} 
                                size="sm" 
                                onClick={() => setLabel(suggestion)}
                             />
                         ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
