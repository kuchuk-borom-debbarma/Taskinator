import React, { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, Loader2, BellOff, Info, Zap, AlertTriangle } from 'lucide-react';
import { notificationApi } from '../api/client';
import type { InternalNotification } from '../types';
import { cn } from '../utils/cn';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const TYPE_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
    INFO:    { icon: <Info size={13} />,          color: 'text-blue-400 bg-blue-400/10' },
    WARNING: { icon: <AlertTriangle size={13} />, color: 'text-amber-400 bg-amber-400/10' },
    TRIGGER: { icon: <Zap size={13} />,           color: 'text-violet-400 bg-violet-400/10' },
};

const fallbackType = { icon: <Bell size={13} />, color: 'text-primary bg-primary/10' };

function NotificationItem({
    notification,
    onMarkRead,
}: {
    notification: InternalNotification;
    onMarkRead: (id: string) => void;
}) {
    const style = TYPE_STYLES[notification.type.toUpperCase()] ?? fallbackType;

    return (
        <div
            className={cn(
                'group flex gap-3 px-4 py-3 transition-colors cursor-pointer border-b border-border/20 last:border-0',
                notification.isRead ? 'opacity-60 hover:opacity-80' : 'bg-secondary/20 hover:bg-secondary/30',
            )}
            onClick={() => !notification.isRead && onMarkRead(notification.id)}
        >
            {/* Type icon */}
            <div className={cn('mt-0.5 shrink-0 w-6 h-6 rounded-md flex items-center justify-center', style.color)}>
                {style.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground leading-tight truncate">{notification.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{notification.message}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">
                    {new Date(notification.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </p>
            </div>

            {/* Unread dot */}
            {!notification.isRead && (
                <div className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-primary" />
            )}
        </div>
    );
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, userId }) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const qc = useQueryClient();

    // Close on outside click
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

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', userId],
        queryFn: () => notificationApi.getNotifications({ limit: 50 }),
        enabled: isOpen,
    });

    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread', userId],
        queryFn: () => notificationApi.getUnreadCount(),
    });

    const unreadCount = unreadData?.count ?? 0;

    const markReadMutation = useMutation({
        mutationFn: (id: string) => notificationApi.markAsRead(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications', userId] });
            qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
        },
    });

    const markAllMutation = useMutation({
        mutationFn: () => notificationApi.markAllAsRead(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['notifications', userId] });
            qc.invalidateQueries({ queryKey: ['notifications-unread', userId] });
        },
    });

    return (
        <>
            {/* Bell trigger button (rendered inline — callers place this themselves) */}

            {/* Dropdown panel */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="absolute right-0 top-full mt-2 w-80 bg-[#0d0d0d] border border-border/60 rounded-xl shadow-2xl z-50 flex flex-col max-h-[480px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
                        <div className="flex items-center gap-2">
                            <Bell size={13} className="text-primary" />
                            <h3 className="text-[12px] font-bold uppercase tracking-wider">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold bg-primary text-white rounded-full px-1.5 py-0.5 leading-none">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllMutation.mutate()}
                                    disabled={markAllMutation.isPending}
                                    title="Mark all as read"
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-all disabled:opacity-50"
                                >
                                    <CheckCheck size={12} />
                                    All read
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10 text-muted-foreground">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 gap-3">
                                <BellOff size={28} />
                                <p className="text-[11px]">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <NotificationItem
                                    key={n.id}
                                    notification={n}
                                    onMarkRead={(id) => markReadMutation.mutate(id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
