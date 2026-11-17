'use client';

import React, { useState } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useDirectAIChatroom } from '@/src/hooks/use-direct-ai-chatroom';
import { Loader2, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const {
    chatrooms,
    isLoading,
    error,
    renameChatroom,
    deleteChatroom,
    updatingChatroomId,
    deletingChatroomId,
  } = useDirectAIChatroom(session?.accessToken);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const handleEditSubmit = async (e: React.FormEvent, roomId: string) => {
    e.preventDefault();

    const title = editTitle.trim();
    if (!title) return;

    const current = chatrooms.find((room) => room.id === roomId);
    if (current?.title === title) {
      setEditingId(null);
      return;
    }

    try {
      await renameChatroom(roomId, title);
      toast.success('Chat renamed');
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename chat');
    }
  };

  const handleDelete = async (roomId: string) => {

    try {
      if (editingId === roomId) {
        setEditingId(null);
      }
      await deleteChatroom(roomId);
      setDeleteTarget(null);
      toast.success('Chat deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete chat');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (chatrooms.length === 0 && isCompact) return null;

  return (
    <div className="flex flex-col h-full border-t border-border">
      {!isCompact && (
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Chat History
        </div>
      )}
      <div className="flex-1 overflow-y-auto w-full">
        {chatrooms.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground text-center">
            No history yet
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {chatrooms.map((room) => {
              const isUpdating = updatingChatroomId === room.id;
              const isDeleting = deletingChatroomId === room.id;
              const isBusy = isUpdating || isDeleting;

              return (
              <li
                key={room.id}
                className={`group relative rounded-md hover:bg-accent hover:text-accent-foreground ${isDeleting ? 'opacity-60' : ''}`}
              >
                {editingId === room.id ? (
                  <form onSubmit={(e) => handleEditSubmit(e, room.id)} className="flex items-center p-2 w-full">
                    <input
                      autoFocus
                      type="text"
                      className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 min-w-0"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setEditingId(null);
                        }
                      }}
                      disabled={isBusy}
                    />
                    <button
                      type="submit"
                      disabled={isBusy || !editTitle.trim()}
                      className="ml-1 p-1 text-green-500 hover:bg-green-500/10 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={isBusy}
                      className="p-1 text-muted-foreground hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <div
                    className={`flex shrink-0 items-center justify-between p-2 w-full text-left ${isBusy ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => !isBusy && onSelectChat(room.id, room.title || 'AI Chat')}
                    title={room.title || 'AI Chat'}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                      {!isCompact && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm truncate">{room.title || 'AI Chat'}</span>
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
                          className="p-1 hover:text-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTitle(room.title || '');
                            setEditingId(room.id);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          className="p-1 hover:text-destructive rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isBusy}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: room.id, title: room.title || 'AI Chat' });
                          }}
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
        {!isLoading && error && (
          <div className="px-4 py-2 text-xs text-destructive text-center">{error}</div>
        )}
      </div>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deletingChatroomId) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently remove
              {' '}
              <span className="font-medium text-foreground">{deleteTarget?.title || 'this chat'}</span>
              {' '}
              and its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingChatroomId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={Boolean(deletingChatroomId) || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                void handleDelete(deleteTarget.id);
              }}
            >
              {deletingChatroomId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
