import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

const AI_TAG_REGEX = /(?:^|\s)@ai\b/i;

/** Strip every occurrence of the @ai tag (case-insensitive) from the text. */
export function stripAiTag(text: string): string {
  return text.replace(/@ai\b/gi, '').replace(/\s{2,}/g, ' ').trim();
}

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
  const [showModelPicker, setShowModelPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsAiTaggedRef = useRef(false);

  // Detect @ai tag in content
  const isAiTagged = useMemo(() => AI_TAG_REGEX.test(content), [content]);

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

  const handleModelChange = useCallback((nextModelId: string) => {
    setAiModelId(nextModelId);
    onSelectedAiModelChange?.(nextModelId === NO_AI_MODEL_VALUE ? null : nextModelId);
    setShowModelPicker(false);
  }, [onSelectedAiModelChange]);

  const dismissModelPicker = useCallback(() => {
    setShowModelPicker(false);
  }, []);

  const handleContentChange = (value: string) => {
    setContent(value);
    const nextIsAiTagged = AI_TAG_REGEX.test(value);
    if (nextIsAiTagged && !prevIsAiTaggedRef.current) {
      setShowModelPicker(true);
    }
    prevIsAiTaggedRef.current = nextIsAiTagged;
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
    setShowModelPicker(false);
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

  // Resolve the selected model name for display
  const selectedModelName = useMemo(() => {
    if (resolvedAiModelId === NO_AI_MODEL_VALUE || !resolvedAiModelId) return null;
    const model = models.find((m) => getModelId(m) === resolvedAiModelId);
    return model?.name || model?.modelName || null;
  }, [resolvedAiModelId, models]);

  return {
    content,
    setContent,
    handleContentChange,
    resolvedAiModelId,
    handleModelChange,
    textareaRef,
    resetComposer,
    isAiTagged,
    showModelPicker,
    dismissModelPicker,
    selectedModelName,
  };
}
