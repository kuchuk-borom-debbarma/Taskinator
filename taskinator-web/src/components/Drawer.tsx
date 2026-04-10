import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop */}
            <div 
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />
            
            {/* Panel */}
            <div 
                className={cn(
                    "fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0d0d0d] border-l border-border/50 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="h-14 border-b border-border/30 flex items-center justify-between px-6 shrink-0 bg-secondary/5">
                    <h3 className="text-sm font-bold tracking-tight">{title}</h3>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {children}
                </div>
            </div>
        </>
    );
};
