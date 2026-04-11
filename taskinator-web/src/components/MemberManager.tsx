import React from 'react';
import { Trash2, Users } from 'lucide-react';
import { UserSearchDropdown } from './UserSearchDropdown';
import type { UserSearchResult } from '../api/client';

interface Member {
    id: string;
    userId: string;
    user?: { id: string; username: string; email: string };
}

interface MemberManagerProps {
    members: Member[];
    onAdd: (userId: string) => void;
    onRemove: (memberId: string) => void;
    title?: string;
    placeholder?: string;
    projectId?: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
    members,
    onAdd,
    onRemove,
    title = 'Members',
    placeholder = 'Search by username or paste user ID...',
    projectId,
}) => {
    const handleSelect = (user: UserSearchResult) => {
        const alreadyMember = members.some(m => m.userId === user.id);
        if (!alreadyMember) onAdd(user.id);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-muted-foreground" />
                    <h4 className="text-sm font-bold tracking-tight">{title}</h4>
                </div>
                <span className="text-[10px] font-bold bg-secondary/50 px-2 py-0.5 rounded-full text-muted-foreground border border-border/30">
                    {members.length}
                </span>
            </div>

            <UserSearchDropdown
                onSelect={handleSelect}
                placeholder={placeholder}
                projectContext={projectId ? { projectId } : undefined}
            />

            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {members.map((member) => (
                    <div
                        key={member.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/40 border border-transparent hover:border-border/30 group transition-all"
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 shrink-0 rounded bg-accent/20 border border-accent/30 flex items-center justify-center text-[11px] font-bold text-accent-foreground shadow-sm">
                                {(member.user?.username || member.userId).substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-medium truncate">
                                    {member.user?.username || member.userId}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate opacity-60">
                                    {member.user?.email || `ID: ${member.id.substring(0, 8)}`}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => onRemove(member.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {members.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-border/20 rounded-xl">
                        <p className="text-[11px] text-muted-foreground">No members found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
