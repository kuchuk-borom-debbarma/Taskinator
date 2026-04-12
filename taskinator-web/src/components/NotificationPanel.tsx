import React, { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, Loader2, BellOff, Info, Zap, AlertTriangle } from 'lucide-react';
import { gqlClient } from '../graphql/client';
import { 
  GET_NOTIFICATIONS, 
  GET_UNREAD_NOTIFICATIONS_COUNT, 
  MARK_NOTIFICATION_READ, 
  MARK_ALL_NOTIFICATIONS_READ 
} from '../graphql/operations';
import type { InternalNotification } from '../types';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const TYPE_STYLES: Record<string, { icon: React.ReactNode; color: string; glow: string }> = {
  INFO:    { icon: <Info size={13} />,          color: 'text-blue-400 bg-blue-400/10', glow: 'shadow-[0_0_10px_rgba(96,165,250,0.2)]' },
  WARNING: { icon: <AlertTriangle size={13} />, color: 'text-amber-400 bg-amber-400/10', glow: 'shadow-[0_0_10px_rgba(251,191,36,0.2)]' },
  TRIGGER: { icon: <Zap size={13} />,           color: 'text-violet-400 bg-violet-400/10', glow: 'shadow-[0_0_10px_rgba(167,139,250,0.2)]' },
};

const fallbackType = { icon: <Bell size={13} />, color: 'text-primary bg-primary/10', glow: '' };

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: InternalNotification;
  onMarkRead: (id: string) => void;
}) {
  const style = TYPE_STYLES[notification.type.toUpperCase()] ?? fallbackType;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'group flex gap-4 px-5 py-4 transition-all cursor-pointer border-b border-white/[0.03] last:border-0 relative',
        notification.isRead ? 'opacity-40 hover:opacity-100' : 'bg-white/[0.02] hover:bg-white/[0.04]',
      )}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      {/* Type icon */}
      <div className={cn('mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-white/5', style.color, style.glow)}>
        {style.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-foreground leading-tight truncate">{notification.title}</p>
          <span className="text-[9px] font-medium text-muted-foreground/40 whitespace-nowrap tabular-nums">
            {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-1 leading-relaxed line-clamp-2">{notification.message}</p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
      )}

      {!notification.isRead && (
        <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-primary rounded-r-full" />
      )}
    </motion.div>
  );
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, userId }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => gqlClient.request<any>(GET_NOTIFICATIONS, { first: 30 }),
    enabled: isOpen,
  });
  const notifications = (statusData?.notifications?.edges ?? []).map((e: any) => e.node);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', userId],
    queryFn: () => gqlClient.request<any>(GET_UNREAD_NOTIFICATIONS_COUNT),
  });

  const unreadCount = unreadData?.unreadNotificationsCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => gqlClient.request<any>(MARK_NOTIFICATION_READ, { id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => gqlClient.request<any>(MARK_ALL_NOTIFICATIONS_READ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', userId] });
      qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
    },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 top-full mt-3 w-[360px] glass border border-white/5 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[520px] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] shrink-0 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold tracking-tight">Activity Center</h3>
              {unreadCount > 0 && (
                <div className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {unreadCount} New
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  <CheckCheck size={14} />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 size={24} className="animate-spin text-primary opacity-50" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/30 gap-4">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center">
                  <BellOff size={32} strokeWidth={1.5} />
                </div>
                <p className="text-[12px] font-medium">All caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n: any) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Link to full History if needed */}
          <div className="px-5 py-3 border-t border-white/[0.05] bg-white/[0.01] flex justify-center">
            <button className="text-[11px] font-bold text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-widest">
              View All History
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
