import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'sm',
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full glass rounded-[24px] shadow-2xl flex flex-col overflow-hidden border border-white/5",
              sizes[size]
            )}
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-foreground">{title}</h3>
                  {description && (
                    <p className="text-sm text-muted-foreground/60">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 pb-8 pt-2 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-8 py-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
