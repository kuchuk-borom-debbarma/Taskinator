import React, { useState } from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

const PRESETS = [
  { label: 'Todo', value: 'TODO', color: 'bg-white/5 text-muted-foreground border-white/10' },
  { label: 'In Progress', value: 'IN_PROGRESS', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { label: 'Done', value: 'DONE', color: 'bg-primary/10 text-primary border-primary/20' },
  { label: 'Blocked', value: 'BLOCKED', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
];

interface StatusPickerProps {
  status: string;
  onChange: (status: string) => void;
  className?: string;
}

export const StatusPicker: React.FC<StatusPickerProps> = ({ status, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const currentPreset = PRESETS.find(p => p.value === status);
  const isCustom = !currentPreset;

  return (
    <div className={cn("w-full", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest shrink-0",
          currentPreset ? currentPreset.color : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        <span>{isCustom ? status : currentPreset?.label}</span>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-[#0f0f11] border border-white/10 rounded-2xl shadow-xl space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      onChange(preset.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border",
                      status === preset.value 
                        ? "bg-white/10 border-white/20 text-white" 
                        : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", preset.color.split(' ')[0])} />
                      {preset.label}
                    </div>
                    {status === preset.value && <Check size={14} /> }
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5">
                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2 pl-1">
                  <Zap size={10} className="text-amber-500" /> Custom Status
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    autoFocus
                    placeholder="Enter custom workflow status..."
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customValue.trim()) {
                        onChange(customValue.trim());
                        setIsOpen(false);
                        setCustomValue('');
                      }
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[12px] font-bold outline-none focus:border-primary/40 transition-colors"
                  />
                  <button 
                    disabled={!customValue.trim()}
                    onClick={() => {
                      onChange(customValue.trim());
                      setIsOpen(false);
                      setCustomValue('');
                    }}
                    className="bg-primary hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl px-4 flex items-center justify-center transition-all"
                  >
                    <Check size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
