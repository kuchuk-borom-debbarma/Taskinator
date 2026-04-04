import React, { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';

interface Member {
    id: string;
    userId: string;
}

interface MemberManagerProps {
    members: Member[];
    onAdd: (userId: string) => void;
    onRemove: (memberId: string) => void;
    title?: string;
    placeholder?: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
    members,
    onAdd,
    onRemove,
    title = "Members",
    placeholder = "Enter User ID..."
}) => {
    const [newUserId, setNewUserId] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserId.trim()) {
            onAdd(newUserId.trim());
            setNewUserId('');
        }
    };

    return (
        <div className="space-y-4 text-foreground">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">{title}</h4>
                <span className="text-xs text-muted">{members.length} total</span>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-secondary/50 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary transition-all"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                />
                <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white p-1.5 rounded-md transition-colors"
                >
                    <Plus size={18} />
                </button>
            </form>

            <div className="space-y-1">
                {members.map((member) => (
                    <div 
                        key={member.id} 
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/30 group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                                {member.userId.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{member.userId}</span>
                                <span className="text-[10px] text-muted">ID: {member.id.substring(0, 8)}...</span>
                            </div>
                        </div>
                        <button
                            onClick={() => onRemove(member.id)}
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                
                {members.length === 0 && (
                    <p className="text-xs text-center text-muted py-4 italic">No members added yet.</p>
                )}
            </div>
        </div>
    );
};
