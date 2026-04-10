import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, description, children, footer }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />
            
            {/* Modal Panel */}
            <div 
                className={cn(
                    "relative w-full max-w-lg bg-[#0d0d0d] border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200",
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-secondary/10">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
                        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-6 py-4 bg-secondary/5 border-t border-border/30 flex items-center justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
