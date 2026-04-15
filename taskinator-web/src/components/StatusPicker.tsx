import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPreset = PRESETS.find(p => p.value === status);
  const isCustom = !currentPreset;

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-black uppercase tracking-widest",
          currentPreset ? currentPreset.color : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          "hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        <span>{isCustom ? status : currentPreset?.label}</span>
        <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 glass border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  onChange(preset.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-bold transition-all",
                  status === preset.value ? "bg-white/10 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
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

          <div className="mt-2 pt-2 border-t border-white/5">
             <div className="px-3 pb-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
               <Zap size={10} className="text-amber-500" /> Custom Status
             </div>
             <div className="flex gap-1.5 px-1 pb-1">
                <input 
                   type="text"
                   autoFocus
                   placeholder="Type status..."
                   value={customValue}
                   onChange={(e) => setCustomValue(e.target.value.toUpperCase())}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && customValue.trim()) {
                       onChange(customValue.trim());
                       setIsOpen(false);
                       setCustomValue('');
                     }
                   }}
                   className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none focus:border-primary/40 transition-colors"
                />
                <button 
                  disabled={!customValue.trim()}
                  onClick={() => {
                    onChange(customValue.trim());
                    setIsOpen(false);
                    setCustomValue('');
                  }}
                  className="bg-primary hover:bg-indigo-500 disabled:opacity-30 text-white rounded-lg px-3 flex items-center justify-center transition-all"
                >
                   <Check size={14} />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
