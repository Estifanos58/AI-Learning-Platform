import { useEffect, useMemo, useRef, useState } from 'react';
import { AIModel } from '@/src/lib/types';
import { NO_AI_MODEL_VALUE } from './types';

interface UseChatComposerStateOptions {
  models: AIModel[];
  isDirectChat: boolean;
  selectedAiModelId?: string | null;
  onSelectedAiModelChange?: (modelId: string | null) => void;
  onTypingChange?: (isTyping: boolean) => Promise<void> | void;
}

const getModelId = (model?: AIModel | null) => model?.id || model?.modelId || '';

export function useChatComposerState({
  models,
  isDirectChat,
  selectedAiModelId,
  onSelectedAiModelChange,
  onTypingChange,
}: UseChatComposerStateOptions) {
  const [content, setContent] = useState('');
  const [aiModelId, setAiModelId] = useState(() =>
    isDirectChat ? NO_AI_MODEL_VALUE : (models.length > 0 ? getModelId(models[0]) : ''),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirectChat && models.length > 0 && !aiModelId) {
      setAiModelId(getModelId(models[0]));
    }
  }, [aiModelId, isDirectChat, models]);

  const resolvedAiModelId = useMemo(() => {
    const preferredModelId = selectedAiModelId ?? aiModelId;
    if (isDirectChat && (preferredModelId === NO_AI_MODEL_VALUE || !preferredModelId)) return NO_AI_MODEL_VALUE;
    if (preferredModelId && preferredModelId !== NO_AI_MODEL_VALUE && models.some((model) => getModelId(model) === preferredModelId)) return preferredModelId;
    if (!isDirectChat && models.length > 0) return getModelId(models[0]);
    return isDirectChat ? NO_AI_MODEL_VALUE : '';
  }, [aiModelId, isDirectChat, models, selectedAiModelId]);

  useEffect(() => {
    if (!resolvedAiModelId) return;

    const effectiveModelId = resolvedAiModelId === NO_AI_MODEL_VALUE ? null : resolvedAiModelId;
    const effectiveSelectedId = selectedAiModelId === NO_AI_MODEL_VALUE ? null : selectedAiModelId;
    if (effectiveSelectedId !== effectiveModelId) onSelectedAiModelChange?.(effectiveModelId);
  }, [onSelectedAiModelChange, resolvedAiModelId, selectedAiModelId]);

  const handleModelChange = (nextModelId: string) => {
    setAiModelId(nextModelId);
    onSelectedAiModelChange?.(nextModelId === NO_AI_MODEL_VALUE ? null : nextModelId);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    if (!onTypingChange) return;

    if (value.trim().length === 0) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onTypingChange(false);
      return;
    }

    onTypingChange(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const resetComposer = () => {
    setContent('');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    onTypingChange?.(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
  }, [content]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, []);

  return {
    content,
    setContent,
    handleContentChange,
    resolvedAiModelId,
    handleModelChange,
    textareaRef,
    resetComposer,
  };
}
