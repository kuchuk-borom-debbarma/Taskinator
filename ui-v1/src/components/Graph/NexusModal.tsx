import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Orbit } from 'lucide-react';

interface NexusModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const NexusModal: React.FC<NexusModalProps> = ({ isOpen, onClose, children, title = "Neural Nexus" }) => {
  // Handle Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent background scroll when modal is open
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-500">
      
      {/* Immersive Glassmorphic Backdrop */}
      <div 
        className="absolute inset-0 bg-text-notion/40 backdrop-blur-3xl transition-all duration-1000"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full h-full max-w-[95vw] max-h-[92vh] bg-white/20 rounded-[3rem] border border-white/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-12 duration-700">
        
        {/* Modal Header HUD */}
        <div className="flex items-center justify-between px-10 py-6 border-b border-white/10 glass-dark">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-focus-blue/10 rounded-2xl">
              <Orbit className="text-focus-blue animate-spin-slow" size={24} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                {title}
              </h2>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Immersive Discovery Engine</span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-4 rounded-2xl bg-white/10 text-white/60 hover:bg-white hover:text-text-notion transition-all duration-300 group active:scale-95"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          </button>
        </div>

        {/* Neural Canvas Area */}
        <div className="flex-1 min-h-0 relative">
          {children}
        </div>

        {/* Tactical Footer */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full z-40 pointer-events-none">
           <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
            Press [ESC] to sever connection
           </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
