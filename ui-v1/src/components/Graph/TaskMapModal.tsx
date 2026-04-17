import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Map } from 'lucide-react';

interface TaskMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const TaskMapModal: React.FC<TaskMapModalProps> = ({ isOpen, onClose, children, title = "Task Relationships" }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
      
      {/* Semi-transparent Overlay */}
      <div 
        className="absolute inset-0 bg-black/20 transition-all duration-300"
        onClick={onClose}
      />

      {/* Modal Container: Clean White Notion Theme */}
      <div className="relative w-full h-full max-w-[95vw] max-h-[92vh] bg-white rounded-2xl border border-border-notion shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Simple Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border-notion bg-white">
          <div className="flex items-center gap-3">
            <Map className="text-text-dim" size={18} />
            <h2 className="text-[15px] font-bold text-text-notion">
              {title}
            </h2>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-md hover:bg-bg-secondary text-text-dim transition-colors active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 min-h-0 relative bg-bg-secondary">
          {children}
        </div>

        {/* Footer Hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white border border-border-notion rounded-full z-40 pointer-events-none shadow-sm">
           <span className="text-[9px] font-bold uppercase tracking-wider text-text-dim">
            Esc to close
           </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
