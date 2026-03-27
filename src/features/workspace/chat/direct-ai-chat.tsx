'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, File, X, Sparkles, Loader2, Play } from 'lucide-react';
import { useAuth } from '@/src/contexts/auth';
import { gatewayApi } from '@/src/lib/api/gateway';
import { toast } from 'sonner';

interface DirectAiChatProps {
  tabId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function DirectAiChat({ tabId }: DirectAiChatProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDragOver = (e: React.DragEvent) => {
    // Specifically handle file items dragged from workspace
    if (e.dataTransfer.types.includes('application/x-workspace-file')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-workspace-file')) {
      e.preventDefault();
      e.stopPropagation(); // prevent pane from opening it as a tab
      const data = e.dataTransfer.getData('application/x-workspace-file');
      if (data) {
        try {
          const fileInfo = JSON.parse(data);
          if (!attachedFiles.some(f => f.id === fileInfo.id)) {
            setAttachedFiles(prev => [...prev, { id: fileInfo.id, name: fileInfo.originalName }]);
          }
        } catch (err) {}
      }
    }
  };

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || !session?.accessToken) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    const placeholderId = `ai-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        id: placeholderId,
        role: 'assistant',
        content: '',
        isLoading: true
      }
    ]);

    try {
      const response = await gatewayApi.chat.startAiExecution(session.accessToken, {
        prompt: userMessage.content,
        mode: 'deep',
        fileIds: attachedFiles.map(f => f.id)
      });
      
      setAttachedFiles([]);
      let accumulatedContent = '';

      if (response && response.requestId) {
        await gatewayApi.chat.streamAiExecution({
          token: session.accessToken,
          requestId: response.requestId,
          onChunk: ({ contentDelta }) => {
            accumulatedContent += contentDelta;
            setMessages(prev => prev.map(m => 
              m.id === placeholderId 
                ? { ...m, content: accumulatedContent, isLoading: false }
                : m
            ));
          },
          onStage: ({ stageName, stageStatus }) => {
            if (!accumulatedContent) {
              setMessages(prev => prev.map(m => 
                m.id === placeholderId 
                  ? { ...m, content: `[Stage: ${stageName}] ${stageStatus}...`, isLoading: true }
                  : m
              ));
            }
          },
          onCompleted: ({ finalContent }) => {
            if (finalContent) accumulatedContent = finalContent;
            setMessages(prev => prev.map(m => 
              m.id === placeholderId 
                ? { ...m, content: accumulatedContent, isLoading: false }
                : m
            ));
            setIsSending(false);
          },
          onFailed: ({ error }) => {
            setMessages(prev => prev.map(m => 
              m.id === placeholderId 
                ? { ...m, content: accumulatedContent ? accumulatedContent + `\n\n[Error: ${error}]` : `Error: ${error}`, isLoading: false }
                : m
            ));
            setIsSending(false);
          },
          onCancelled: () => {
            setMessages(prev => prev.map(m => 
              m.id === placeholderId 
                ? { ...m, content: accumulatedContent ? accumulatedContent + '\n\n[Cancelled]' : 'Execution Cancelled.', isLoading: false }
                : m
            ));
            setIsSending(false);
          }
        });
      } else {
        toast.error('Failed to get request ID from execution start');
        setMessages(prev => prev.map(m => 
          m.id === placeholderId 
            ? { ...m, content: 'Failed to start execution.', isLoading: false }
            : m
        ));
        setIsSending(false);
      }
    } catch (err) {
      toast.error('Failed to start AI execution');
      setMessages(prev => prev.map(m => 
        m.id === placeholderId 
          ? { ...m, content: 'Failed to execute request.', isLoading: false }
          : m
      ));
      setIsSending(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-background relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2 text-foreground">Direct AI Mode</h2>
            <p className="max-w-md text-center">
              Send a prompt to start a Deep AI Execution. Drag and drop files from the sidebar to include them in the context.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {msg.content ? (
                  <div className="space-y-1">
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                ) : (
                  msg.isLoading && (
                    <div className="flex items-center space-x-2 text-muted-foreground py-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-background border-t border-border">
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map(file => (
              <div key={file.id} className="flex items-center bg-card border border-border px-2 py-1 rounded text-xs">
                <File className="w-3 h-3 mr-1.5 opacity-70" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="ml-2 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your prompt... (Drag files here to append)"
            className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || (!input.trim() && attachedFiles.length === 0)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
        </form>
      </div>
    </div>
  );
}
