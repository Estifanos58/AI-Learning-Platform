'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useChatrooms } from '@/src/hooks/use-chatrooms';
import { Loader2, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { toast } from 'sonner';

interface AiChatHistoryProps {
  onSelectChat: (chatroomId: string, title?: string) => void;
  isCompact: boolean;
}

function formatRelativeTime(value?: string) {
  if (!value) return '';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function AiChatHistory({ onSelectChat, isCompact }: AiChatHistoryProps) {
  const { session } = useAuth();
  const { chatrooms, isLoading, refresh } = useChatrooms(session?.accessToken);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const aiChatrooms = (chatrooms || [])
    .filter((room) => {
      if (room.type === 'AI' || room.type === 'DOCUMENT_CONTEXT') return true;
      if (room.type === 'DM' || room.type === 'DIRECT' || room.type === 'GROUP') return false;
      return !room.otherUserId;
    })
    .sort((a, b) => {
      const aTs = new Date(a.updatedAt || a.createdAt).getTime();
      const bTs = new Date(b.updatedAt || b.createdAt).getTime();
      return bTs - aTs;
    });

  const handleEditSubmit = async (e: React.FormEvent, roomId: string) => {
    e.preventDefault();
    if (!editName.trim() || !session?.accessToken) return;
    try {
      await gatewayApi.chat.updateChatroom(session.accessToken, roomId, { name: editName });
      toast.success('Chat renamed');
      setEditingId(null);
      refresh();
    } catch {
      toast.error('Failed to rename chat');
    }
  };

  const handleDelete = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    if (!session?.accessToken) return;
    try {
      await gatewayApi.chat.deleteChatroom(session.accessToken, roomId);
      toast.success('Chat deleted');
      refresh();
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (aiChatrooms.length === 0 && isCompact) return null;

  return (
    <div className="flex flex-col h-full border-t border-border">
      {!isCompact && (
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Chat History
        </div>
      )}
      <div className="flex-1 overflow-y-auto w-full">
        {aiChatrooms.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
            No history yet
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {aiChatrooms.map(room => (
              <li key={room.id} className="group relative rounded-md hover:bg-accent hover:text-accent-foreground">
                {editingId === room.id ? (
                  <form onSubmit={(e) => handleEditSubmit(e, room.id)} className="flex items-center p-2 w-full">
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 min-w-0"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button type="submit" className="ml-1 p-1 text-green-500 hover:bg-green-500/10 rounded">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div 
                    className="flex shrink-0 items-center justify-between p-2 cursor-pointer w-full text-left"
                    onClick={() => onSelectChat(room.id, room.name || 'AI Chat')}
                    title={room.name || 'AI Chat'}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                      {!isCompact && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{room.name || 'AI Chat'}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {formatRelativeTime(room.updatedAt || room.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {!isCompact && (
                      <div className="hidden group-hover:flex items-center text-muted-foreground shrink-0 pl-1">
                        <button
                          type="button"
                          className="p-1 hover:text-foreground rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditName(room.name || '');
                            setEditingId(room.id);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="p-1 hover:text-destructive rounded"
                          onClick={(e) => handleDelete(room.id, e)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
