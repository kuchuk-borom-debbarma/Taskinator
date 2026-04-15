import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Plus, Trash2, Zap, ArrowRight, Settings2, GitCommit, 
  SearchCode, ChevronDown, Layers, Box, Terminal,
  Workflow, Hash, AlignLeft, User, Activity, AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

export interface Condition {
  field: string;
  op: string;
  value?: string;
}

export interface RuleGroup {
  id: string; // Internal unique ID for React keys
  operator: 'AND' | 'OR';
  rules: (Condition | RuleGroup)[];
}

interface Action {
  type: string;
  target: string;
  params: Record<string, string>;
  targetIds?: string[];
}

export interface AutomationRule {
  name: string;
  when: {
    operator: 'AND' | 'OR';
    rules: any[]; // Recursive structure
  };
  then: Action[];
}

interface AutomationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: AutomationRule[]) => void;
  initialRule?: AutomationRule;
  title?: string;
  tasks?: any[];
}

// --- Constants ---

const FIELDS = [
  { value: 'status', label: 'Status', icon: <Activity size={12} /> },
  { value: 'title', label: 'Title', icon: <AlignLeft size={12} /> },
  { value: 'description', label: 'Description', icon: <AlignLeft size={12} /> },
  { value: 'teamId', label: 'Team', icon: <Workflow size={12} /> },
  { value: 'memberId', label: 'Assignee', icon: <User size={12} /> },
];

const OPERATORS = [
  { value: 'CHANGED_TO', label: 'Changes to', color: 'text-emerald-400' },
  { value: 'HAS_CHANGED', label: 'Any change', color: 'text-amber-400' },
  { value: 'EQUALS', label: 'Is exactly', color: 'text-blue-400' },
  { value: 'NOT_EQUALS', label: 'Is not', color: 'text-red-400' },
  { value: 'IS_NULL', label: 'Is Unassigned', color: 'text-muted-foreground' },
  { value: 'IS_NOT_NULL', label: 'Is Assigned', color: 'text-primary' },
];

// --- Sub-Components ---

const ConditionRow: React.FC<{
  condition: Condition;
  onUpdate: (updates: Partial<Condition>) => void;
  onRemove: () => void;
}> = ({ condition, onUpdate, onRemove }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 group/row relative py-1"
    >
      <div className="flex-1 flex gap-2 glass p-2 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-colors">
        <select 
          value={condition.field}
          onChange={(e) => onUpdate({ field: e.target.value })}
          className="flex-1 min-w-[100px] bg-transparent text-[11px] font-bold outline-none cursor-pointer"
        >
          {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>

        <select
          value={condition.op}
          onChange={(e) => onUpdate({ op: e.target.value })}
          className={cn(
            "flex-1 min-w-[100px] bg-transparent text-[11px] font-black uppercase tracking-tighter outline-none cursor-pointer",
            OPERATORS.find(o => o.value === condition.op)?.color
          )}
        >
          {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(!['HAS_CHANGED', 'IS_NULL', 'IS_NOT_NULL'].includes(condition.op)) && (
          <input 
            type="text"
            placeholder="Value..."
            value={condition.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            className="flex-1 min-w-[100px] bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[11px] font-bold outline-none focus:border-primary/50"
          />
        )}
      </div>

      <button 
        onClick={onRemove}
        className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors opacity-0 group-hover/row:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
};

const GroupView: React.FC<{
  group: RuleGroup;
  onUpdate: (updates: Partial<RuleGroup>) => void;
  onRemove?: () => void;
  depth: number;
}> = ({ group, onUpdate, onRemove, depth }) => {
  const isRoot = depth === 0;

  const handleUpdateItem = (index: number, item: Condition | RuleGroup) => {
    const newRules = [...group.rules];
    newRules[index] = item;
    onUpdate({ rules: newRules });
  };

  const handleRemoveItem = (index: number) => {
    onUpdate({ rules: group.rules.filter((_, i) => i !== index) });
  };

  const addCondition = () => {
    onUpdate({ rules: [...group.rules, { field: 'status', op: 'CHANGED_TO', value: 'DONE' }] });
  };

  const addGroup = () => {
    onUpdate({ 
      rules: [...group.rules, { 
        id: Math.random().toString(36).substr(2, 9), 
        operator: 'AND', 
        rules: [{ field: 'status', op: 'CHANGED_TO', value: 'DONE' }] 
      }] 
    });
  };

  const toggleOperator = () => {
    onUpdate({ operator: group.operator === 'AND' ? 'OR' : 'AND' });
  };

  return (
    <div className={cn(
      "relative space-y-1",
      !isRoot && "pl-6 py-2 border-l-2 border-white/5 ml-2"
    )}>
      {/* Visual Line Connector */}
      {!isRoot && (
        <div className="absolute -left-[2px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-primary/30 to-transparent" />
      )}

      {group.rules.map((item, idx) => {
        const isGroup = 'operator' in item;

        return (
          <React.Fragment key={isGroup ? (item as RuleGroup).id : `c-${idx}`}>
            {/* Operator Between Rows (except before the first item) */}
            {idx > 0 && (
              <div className="flex items-center gap-3 py-1 group/op h-8">
                 <div className="flex-1 h-[1px] bg-white/5" />
                 <button 
                   onClick={toggleOperator}
                   className={cn(
                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all z-10",
                     group.operator === 'AND' 
                       ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20" 
                       : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
                   )}
                 >
                   {group.operator}
                 </button>
                 <div className="flex-1 h-[1px] bg-white/5" />
              </div>
            )}

            {isGroup ? (
              <GroupView 
                group={item as RuleGroup}
                onUpdate={(upd) => handleUpdateItem(idx, { ...item, ...upd })}
                onRemove={() => handleRemoveItem(idx)}
                depth={depth + 1}
              />
            ) : (
              <ConditionRow 
                condition={item as Condition}
                onUpdate={(upd) => handleUpdateItem(idx, { ...item, ...upd })}
                onRemove={() => handleRemoveItem(idx)}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Control Actions */}
      <div className="flex items-center gap-6 pt-3 px-2">
        <button 
          onClick={addCondition}
          className="text-[10px] font-bold text-muted-foreground/40 hover:text-primary flex items-center gap-1.5 transition-colors"
        >
          <Plus size={10} /> Add Condition
        </button>
        {depth < 2 && (
          <button 
            onClick={addGroup}
            className="text-[10px] font-bold text-muted-foreground/40 hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
          >
            <Layers size={10} /> Add Nested Group
          </button>
        )}
        
        {!isRoot && onRemove && (
          <button 
            onClick={onRemove}
            className="ml-auto text-[10px] font-bold text-red-500/40 hover:text-red-500 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={10} /> Remove Group
          </button>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export const AutomationBuilderModal: React.FC<AutomationBuilderModalProps> = ({
  isOpen, onClose, onSave, initialRule, title, tasks = []
}) => {
  const [name, setName] = useState(initialRule?.name || '');
  
  // Initialize state with root group structure
  const [rootGroup, setRootGroup] = useState<RuleGroup>(() => {
    if (initialRule?.when) {
      return {
        id: 'root',
        operator: initialRule.when.operator,
        rules: initialRule.when.rules.map(c => 
          'operator' in c ? { ...c, id: Math.random().toString(36).substr(2, 9) } : c
        )
      };
    }
    return { 
      id: 'root', 
      operator: 'AND', 
      rules: [{ field: 'status', op: 'CHANGED_TO', value: 'DONE' }] 
    };
  });

  const [actions, setActions] = useState<Action[]>(
    initialRule?.then || [{ type: 'UPDATE_TASK', target: '@children', params: { status: 'DONE' }, targetIds: [] }]
  );

  const handleSave = () => {
    // Clean rootGroup for backend (remove internal IDs)
    const cleanRules = (items: any[]): any[] => {
      return items.map(item => {
        if ('operator' in item) {
          const { id, ...rest } = item;
          return { ...rest, rules: cleanRules(item.rules) };
        }
        return item;
      });
    };

    const rule: AutomationRule = {
      name: name || 'Untitled Automation',
      when: { 
        operator: rootGroup.operator, 
        rules: cleanRules(rootGroup.rules) 
      },
      then: actions,
    };
    onSave([rule]);
  };

  // Action helpers
  const addAction = () => {
    setActions([...actions, { type: 'UPDATE_TASK', target: '@self', params: { status: 'TODO' }, targetIds: [] }]);
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const isValid = actions.length > 0 && 
    actions.every(a => a.target && a.params && Object.keys(a.params).length > 0) &&
    name.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || "Design Automation"}
      description="Define precise logic flows and nested conditions."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
           <div className="flex items-center gap-2 text-muted-foreground/40 italic text-[11px]">
              <AlertCircle size={12} />
              Engine will pre-validate rules before deployment
           </div>
           <button
             disabled={!isValid}
             onClick={handleSave}
             className="px-6 py-2.5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/80 hover:to-indigo-500 text-white rounded-xl text-[13px] font-bold disabled:opacity-30 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
           >
             <Zap size={14} className="fill-white/20" /> Apply Flow
           </button>
        </div>
      }
    >
      <div className="space-y-12 pb-10">

        {/* NAME SECTION */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground ring-1 ring-white/10">
                <Hash size={20} />
             </div>
             <div className="flex-1">
               <input 
                 type="text"
                 placeholder="Enter automation name (e.g., Sync Subtasks to Done)"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-transparent border-none outline-none text-lg font-black placeholder:text-muted-foreground/20 text-foreground"
               />
               <p className="text-[11px] text-muted-foreground/60 font-medium">Give your automation a clear, descriptive name</p>
             </div>
          </div>
        </section>
        
        {/* WHEN SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                <SearchCode size={20} />
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-wider text-primary">When Conditions</h3>
               <p className="text-[11px] text-muted-foreground/60 font-medium">Define complex state matching with nested groups</p>
             </div>
          </div>

          <div className="pl-4">
            <GroupView 
              group={rootGroup} 
              onUpdate={(upd) => setRootGroup({ ...rootGroup, ...upd })}
              depth={0}
            />
          </div>
        </section>

        {/* FLOW CONNECTOR */}
        <div className="flex justify-center py-2 relative">
           <div className="w-[2px] h-8 bg-gradient-to-b from-primary/50 to-purple-500/50" />
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 bg-background border border-white/5 rounded-full">
              <Plus size={10} className="text-muted-foreground/30" />
           </div>
        </div>

        {/* THEN SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
             <div className="h-10 w-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 ring-1 ring-purple-500/20">
                <GitCommit size={20} />
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-wider text-purple-400">Then Do Actions</h3>
               <p className="text-[11px] text-muted-foreground/60 font-medium">Chain multiple mutation steps across structural targets</p>
             </div>
          </div>

          <div className="space-y-4">
            {actions.map((act, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-5 rounded-[24px] border border-white/5 bg-gradient-to-br from-purple-500/5 to-transparent relative group"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Target Info */}
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400/80">
                         <Terminal size={12} /> Execution Target
                      </div>
                      <select
                        value={act.target}
                        onChange={(e) => updateAction(idx, { target: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-foreground outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                      >
                         <option value="@self">Self: Current Task (@self)</option>
                         <option value="@parent">Flow: Parent Task (@parent)</option>
                         <option value="@children">Flow: Direct Subtasks (@children)</option>
                         <option value="@descendants">Tree: All Nested Subtasks (@descendants)</option>
                         <option value="SPECIFIC_TASKS">Manual: Selection (Specific ID)</option>
                      </select>

                      {act.target === 'SPECIFIC_TASKS' && (
                        <div className="space-y-2">
                           <textarea
                             value={(act.targetIds || []).join(', ')}
                             placeholder="Paste comma-separated Task IDs here..."
                             onChange={(e) => {
                               const ids = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                               updateAction(idx, { targetIds: ids });
                             }}
                             className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-mono outline-none focus:border-purple-500/50 min-h-[60px] resize-none"
                           />
                           <div className="flex flex-wrap gap-1.5">
                              {tasks.slice(0, 4).map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => updateAction(idx, { targetIds: Array.from(new Set([...(act.targetIds||[]), t.id])) })}
                                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:border-purple-500/30 text-[9px] font-bold text-muted-foreground transition-all"
                                >
                                  + {t.title.slice(0, 15)}...
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Params Info */}
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400/80">
                         <Settings2 size={12} /> Mutation Params
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(act.params).map(([pKey, pVal]) => (
                          <div key={pKey} className="flex gap-2">
                             <div className="w-[100px] shrink-0 bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-black text-muted-foreground/60 uppercase flex items-center">
                               {pKey}
                             </div>
                             <div className="flex-1 flex gap-2">
                               <input
                                 type="text"
                                 value={pVal}
                                 onChange={(e) => {
                                   const newParams = { ...act.params, [pKey]: e.target.value };
                                   updateAction(idx, { params: newParams });
                                 }}
                                 className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none focus:border-emerald-500/50"
                               />
                               <button 
                                 onClick={() => {
                                   const newParams = { ...act.params };
                                   delete newParams[pKey];
                                   updateAction(idx, { params: newParams });
                                 }}
                                 className="p-2 text-muted-foreground/30 hover:text-red-500 transition-colors"
                               >
                                 <Trash2 size={12} />
                               </button>
                             </div>
                          </div>
                        ))}

                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !act.params[val]) {
                              updateAction(idx, { params: { ...act.params, [val]: '' }});
                            }
                            e.target.value = '';
                          }}
                          value=""
                          className="w-full bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2 transition-all cursor-pointer"
                        >
                           <option value="" disabled>+ Set Update Property</option>
                           <option value="status">Status</option>
                           <option value="title">Title</option>
                           <option value="description">Description</option>
                           <option value="teamId">Team Assignment</option>
                           <option value="memberId">Assignee</option>
                        </select>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => removeAction(idx)}
                  className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                >
                   <Trash2 size={14} />
                </button>
              </motion.div>
            ))}

            <button 
              onClick={addAction}
              className="w-full py-4 rounded-[24px] border-2 border-dashed border-white/5 text-muted-foreground/40 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all flex flex-col items-center justify-center gap-1 group"
            >
               <Workflow size={20} className="group-hover:scale-110 transition-transform" />
               <span className="text-[11px] font-black uppercase tracking-widest">Append Action Step</span>
            </button>
          </div>
        </section>

      </div>
    </Modal>
  );
};

