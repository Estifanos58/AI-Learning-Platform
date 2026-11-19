'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { File, X, Sparkles, Loader2, Bot, StopCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/src/contexts/auth';
import { gatewayApi } from '@/src/lib/api/gateway';
import { GatewayApiError } from '@/src/lib/api/gateway-errors';
import { toast } from 'sonner';
import { useAiModels } from '@/src/hooks/use-ai-models';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DirectChatMessageResponse } from '@/src/lib/types/chat';
import { mutate } from 'swr';
import { AiMessageRenderer, MessageCitation } from './ai-message-renderer';

interface DirectAiChatProps {
  tabId: string;
}

export type ExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type LocalMessage = {
  id: string;
  chatroomId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  status?: "STREAMING" | "COMPLETED" | "FAILED" | "CANCELLED";
  sanitizationFlags?: string[];
  citations?: MessageCitation[];
  stageLabel?: string;
};

type Execution = {
  executionId: string;
  status: ExecutionStatus;
  messageId: string;
  chatroomId: string;
};

const STREAM_MAX_RETRIES = 5;
const STREAM_RETRY_BASE_MS = 1000;
const STREAM_RETRY_MAX_MS = 10000;
const POLL_INTERVAL_MS = 3000;

async function waitWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function DirectAiChat({ tabId }: DirectAiChatProps) {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const { aiModels, isLoading: isLoadingModels } = useAiModels(accessToken);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string }[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const effectiveSelectedModelId = selectedModelId || aiModels?.[0]?.id || '';
  
  // Execution tracking
  const [execution, setExecution] = useState<Execution | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshAiHistory = useCallback(() => {
    if (!accessToken) return;
    void mutate(['direct-chatrooms', accessToken]);
  }, [accessToken]);

  const setAssistantMessage = useCallback(
    (
      primaryMessageId: string,
      secondaryMessageId: string | undefined,
      updater: (msg: LocalMessage) => LocalMessage,
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const matched =
            msg.id === primaryMessageId ||
            (secondaryMessageId ? msg.id === secondaryMessageId : false);
          if (!matched) return msg;
          return updater(msg);
        }),
      );
    },
    [],
  );

  const stopAllExecutionWorkers = useCallback(() => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }

    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
  }, []);

  const resolveErrorMessage = useCallback((error: unknown): string => {
    if (error instanceof GatewayApiError) {
      switch (error.status) {
        case 400:
          return 'Validation failed. Check your prompt and attached files.';
        case 401:
          return 'Your session expired. Please login again.';
        case 403:
          return 'You do not have permission for this AI action.';
        case 404:
          return 'Requested chat or execution was not found.';
        case 409:
          return 'Conflict detected. Refresh and retry.';
        case 429:
          return 'Rate limited. Please wait and try again.';
        case 503:
        case 504:
          return 'AI service is temporarily unavailable. Retry shortly.';
        default:
          return error.message || 'Unexpected API error.';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Failed to process AI request.';
  }, []);

  const startExecutionPollingFallback = useCallback(
    async (activeExecution: Execution, assistantMessageId: string, streamMessageId?: string) => {
      if (!accessToken) return;

      const controller = new AbortController();
      pollAbortRef.current = controller;

      while (!controller.signal.aborted) {
        try {
          const current = await gatewayApi.chat.getAiExecution(accessToken, activeExecution.executionId);
          const status = (current.status || 'RUNNING').toUpperCase() as ExecutionStatus;
          const messageId = current.messageId;
          const terminalContent = current.finalContent || current.content;

          if (status === 'COMPLETED') {
            setAssistantMessage(assistantMessageId, messageId ?? streamMessageId, (msg) => ({
              ...msg,
              content: terminalContent || msg.content,
              status: 'COMPLETED',
            }));
            setExecution(null);
            refreshAiHistory();
            return;
          }

          if (status === 'FAILED') {
            const errorText = current.error || 'AI generation failed';
            setAssistantMessage(assistantMessageId, messageId ?? streamMessageId, (msg) => ({
              ...msg,
              content: msg.content ? `${msg.content}\n\n[Error: ${errorText}]` : `Error: ${errorText}`,
              status: 'FAILED',
            }));
            setExecution(null);
            refreshAiHistory();
            return;
          }

          if (status === 'CANCELLED') {
            setAssistantMessage(assistantMessageId, messageId ?? streamMessageId, (msg) => ({
              ...msg,
              status: 'CANCELLED',
            }));
            setExecution(null);
            refreshAiHistory();
            return;
          }

          setExecution((prev) =>
            prev && prev.executionId === activeExecution.executionId
              ? { ...prev, status }
              : prev,
          );
        } catch {
          // keep polling unless explicitly aborted
        }

        try {
          await waitWithAbort(POLL_INTERVAL_MS, controller.signal);
        } catch {
          return;
        }
      }
    },
    [refreshAiHistory, accessToken, setAssistantMessage],
  );

  const connectExecutionStream = useCallback(
    async (activeExecution: Execution, assistantMessageId: string) => {
      if (!accessToken) return;

      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }

      const controller = new AbortController();
      streamAbortRef.current = controller;

      for (let attempt = 0; attempt <= STREAM_MAX_RETRIES; attempt++) {
        let reachedTerminal = false;
        let streamedMessageId: string | undefined;

        try {
          await gatewayApi.chat.streamAiExecution({
            token: accessToken,
            requestId: activeExecution.executionId,
            signal: controller.signal,
            onReplay: ({ content, status, messageId, sanitizationFlags }) => {
              streamedMessageId = messageId || streamedMessageId;
              setExecution((prev) =>
                prev && prev.executionId === activeExecution.executionId
                  ? {
                      ...prev,
                      status: (status?.toUpperCase() as ExecutionStatus) || 'RUNNING',
                      messageId: messageId || prev.messageId,
                    }
                  : prev,
              );
              setAssistantMessage(assistantMessageId, messageId, (msg) => ({
                ...msg,
                content: content || '',
                status: 'STREAMING',
                sanitizationFlags: sanitizationFlags?.length ? sanitizationFlags : msg.sanitizationFlags,
              }));
            },
            onChunk: ({ contentDelta, messageId, sanitizationFlags, citations }) => {
              streamedMessageId = messageId || streamedMessageId;
              setExecution((prev) =>
                prev && prev.executionId === activeExecution.executionId
                  ? { ...prev, status: 'RUNNING', messageId: messageId || prev.messageId }
                  : prev,
              );
              setAssistantMessage(assistantMessageId, messageId, (msg) => ({
                ...msg,
                content: msg.content + contentDelta,
                status: 'STREAMING',
                sanitizationFlags: sanitizationFlags?.length ? sanitizationFlags : msg.sanitizationFlags,
                citations: citations?.length ? citations : msg.citations,
              }));
            },
            onStage: ({ stageName, stageStatus }) => {
              if (!stageName) return;
              setAssistantMessage(assistantMessageId, streamedMessageId, (msg) => ({
                ...msg,
                stageLabel: stageStatus ? `${stageName} (${stageStatus})` : stageName,
              }));
            },
            onCompleted: ({ finalContent, messageId, sanitizationFlags, citations }) => {
              reachedTerminal = true;
              setAssistantMessage(assistantMessageId, messageId, (msg) => ({
                ...msg,
                content: finalContent || msg.content,
                status: 'COMPLETED',
                sanitizationFlags: sanitizationFlags?.length ? sanitizationFlags : msg.sanitizationFlags,
                citations: citations?.length ? citations : msg.citations,
                stageLabel: undefined,
              }));
              setExecution(null);
              refreshAiHistory();
            },
            onFailed: ({ error, messageId, sanitizationFlags }) => {
              reachedTerminal = true;
              setAssistantMessage(assistantMessageId, messageId, (msg) => ({
                ...msg,
                content: msg.content ? `${msg.content}\n\n[Error: ${error}]` : `Error: ${error}`,
                status: 'FAILED',
                sanitizationFlags: sanitizationFlags?.length ? sanitizationFlags : msg.sanitizationFlags,
              }));
              setExecution(null);
              refreshAiHistory();
            },
            onCancelled: ({ messageId }) => {
              reachedTerminal = true;
              setAssistantMessage(assistantMessageId, messageId, (msg) => ({
                ...msg,
                status: 'CANCELLED',
              }));
              setExecution(null);
              refreshAiHistory();
            },
          });

          if (controller.signal.aborted || reachedTerminal) {
            return;
          }

          throw new Error('Stream disconnected before terminal event.');
        } catch {
          if (controller.signal.aborted) {
            return;
          }

          if (attempt >= STREAM_MAX_RETRIES) {
            toast.warning('Realtime stream disconnected. Switching to status polling.');
            await startExecutionPollingFallback(activeExecution, assistantMessageId, streamedMessageId);
            return;
          }

          const backoff = Math.min(STREAM_RETRY_BASE_MS * 2 ** attempt, STREAM_RETRY_MAX_MS);
          try {
            await waitWithAbort(backoff, controller.signal);
          } catch {
            return;
          }
        }
      }
    },
    [refreshAiHistory, accessToken, setAssistantMessage, startExecutionPollingFallback],
  );

  const loadHistory = useCallback(
    async (roomId: string) => {
      if (!accessToken) return;
      setIsLoadingHistory(true);
      try {
        const messagesRes = await gatewayApi.chat.listDirectChatroomMessages(accessToken, roomId, 0, 100);
        const historyLoaded = messagesRes
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          .map((m: DirectChatMessageResponse) => ({
            id: m.id,
            chatroomId: m.chatroomId,
            role: m.role === 'ASSISTANT' ? ('ASSISTANT' as const) : ('USER' as const),
            content: m.content,
            status: m.status === 'STREAMING' ? ('STREAMING' as const) : m.status === 'FAILED' ? ('FAILED' as const) : m.status === 'CANCELLED' ? ('CANCELLED' as const) : ('COMPLETED' as const),
          }));
        setMessages(historyLoaded);
      } catch {
        toast.error('Failed to load chat history');
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [accessToken],
  );

  // Initialize chatroom from tabId
  useEffect(() => {
    stopAllExecutionWorkers();
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setExecution(null);
      if (!tabId.startsWith('chat-') && tabId) {
        setActiveChatroomId(tabId);
        void loadHistory(tabId);
      } else {
        setActiveChatroomId(null);
        setMessages([]);
      }
    });

    return () => {
      cancelled = true;
      stopAllExecutionWorkers();
    };
  }, [loadHistory, stopAllExecutionWorkers, tabId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const cancelExecution = async () => {
    stopAllExecutionWorkers();

    if (execution?.executionId && session?.accessToken) {
      try {
        await gatewayApi.chat.cancelAiExecution(session.accessToken, execution.executionId);
      } catch {
        // keep local cancellation state even if backend call fails
      }
    }

    setExecution(null);
    setMessages(prev => prev.map(m => m.status === "STREAMING" ? { ...m, status: "CANCELLED" } : m));
    refreshAiHistory();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-workspace-file')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-workspace-file')) {
      e.preventDefault();
      e.stopPropagation();
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

    stopAllExecutionWorkers();

    const userInput = input.trim();
    const userMessageId = `usr-${Date.now()}`;
    const assistantMessageId = `ai-${Date.now()}`;

    const userMsg: LocalMessage = {
      id: userMessageId,
      chatroomId: activeChatroomId || 'temp',
      role: 'USER',
      content: userInput,
      status: 'COMPLETED'
    };

    const assistantMsg: LocalMessage = {
      id: assistantMessageId,
      chatroomId: activeChatroomId || 'temp',
      role: 'ASSISTANT',
      content: '',
      status: 'STREAMING'
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setAttachedFiles([]);

    try {
      const response = await gatewayApi.chat.startAiExecution(session.accessToken, {
        prompt: userInput,
        mode: 'chat',
        aiModelId: effectiveSelectedModelId || undefined,
        fileIds: attachedFiles.map(f => f.id),
        chatroomId: activeChatroomId || undefined,
      });

      const execId = response.requestId;
      const resolvedChatroomId = response.chatroomId || activeChatroomId || 'temp';
      const resolvedMessageId = response.messageId || assistantMessageId;

      const nextExecution: Execution = {
        executionId: execId,
        status: 'PENDING',
        messageId: resolvedMessageId,
        chatroomId: resolvedChatroomId,
      };

      setExecution(nextExecution);
      
      if (response.chatroomId && response.chatroomId !== activeChatroomId) {
        setActiveChatroomId(response.chatroomId);
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === userMessageId || m.id === assistantMessageId) {
            return { ...m, chatroomId: resolvedChatroomId, id: m.id === assistantMessageId ? resolvedMessageId : m.id };
          }
          return m;
        }),
      );

      await connectExecutionStream(nextExecution, resolvedMessageId);
    } catch (err: any) {
      const errMessage = resolveErrorMessage(err);
      toast.error(errMessage);
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId
          ? { ...m, content: `Failed to execute request. ${errMessage}`, status: 'FAILED' }
          : m
      ));
      setExecution(null);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-background relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-full text-muted-foreground">
             <Loader2 className="w-8 h-8 animate-spin" />
             <span className="ml-2">Loading history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
            <Sparkles className="w-12 h-12 mb-4 opacity-50" />
            <h2 className="text-xl font-medium mb-2 text-foreground">Direct AI Mode</h2>
            <p className="max-w-md text-center">
              Send a prompt to start a Deep AI Execution. Drag and drop files from the sidebar to include them in the context.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'USER' ? 'bg-primary text-primary-foreground' : 'bg-muted'} ${msg.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                {msg.content ? (
                  <div className="space-y-1">
                    {msg.role === 'ASSISTANT' ? (
                      <AiMessageRenderer content={msg.content} citations={msg.citations} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                    {msg.sanitizationFlags && msg.sanitizationFlags.length > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700"
                        title={`Output was sanitized: ${msg.sanitizationFlags.join(', ')}`}>
                        <ShieldAlert className="w-3 h-3" />
                        <span>Sanitized</span>
                      </div>
                    )}
                    {msg.status === 'FAILED' && <p className="text-destructive text-xs mt-2 font-medium">Generation Failed</p>}
                    {msg.status === 'CANCELLED' && <p className="text-muted-foreground text-xs mt-2 italic">Generation Cancelled</p>}
                  </div>
                ) : (
                  msg.status === 'STREAMING' && (
                    <div className="flex items-center space-x-2 text-muted-foreground py-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">{msg.stageLabel || 'Thinking...'}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-background border-t border-border">
        {execution?.executionId && (
          <div className="flex justify-center mb-2">
            <button onClick={cancelExecution} className="flex items-center text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 px-3 py-1.5 rounded-full transition-colors">
              <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop Generating
            </button>
          </div>
        )}
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
        
        <div className="flex gap-2 mb-3">
          <Select value={effectiveSelectedModelId} onValueChange={setSelectedModelId} disabled={isLoadingModels}>
            <SelectTrigger className="w-[200px] h-8 text-xs bg-card border-border">
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5" />
                <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select AI Model"} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {aiModels?.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs">
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!!execution?.executionId}
            placeholder={execution?.executionId ? "AI is typing..." : "Type your prompt..."}
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || !!execution?.executionId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {execution?.executionId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
