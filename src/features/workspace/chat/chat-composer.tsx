'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatComposerProps } from './chat-composer/types';
import { NO_AI_MODEL_VALUE } from './chat-composer/types';
import { useChatComposerState, stripAiTag } from './chat-composer/use-chat-composer-state';
import { useFileDropAttachments } from './chat-composer/use-file-drop-attachments';
import { AiModelSelector } from './chat-composer/ai-model-selector';
import { AttachedFilesStrip } from './chat-composer/attached-files-strip';
import { ComposerInput } from './chat-composer/composer-input';

export function ChatComposer({
  onSendMessage,
  onCancelStream,
  onTypingChange,
  isCompact,
  models = [],
  allowFileDrop = false,
  selectedAiModelId,
  onSelectedAiModelChange,
  isAiStreaming = false,
  isDirectChat = false,
}: ChatComposerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const hasAiModels = models.length > 0;

  const {
    content,
    handleContentChange,
    resolvedAiModelId,
    handleModelChange,
    textareaRef,
    resetComposer,
    isAiTagged,
    showModelPicker,
    dismissModelPicker,
    selectedModelName,
  } = useChatComposerState({
    models,
    isDirectChat,
    selectedAiModelId,
    onSelectedAiModelChange,
    onTypingChange,
  });

  const {
    attachedFiles,
    setAttachedFiles,
    isDraggingOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachedFile,
  } = useFileDropAttachments({ allowFileDrop });

  const handleSend = async () => {
    if ((!content.trim() && attachedFiles.length === 0) || isLoading) return;

    // Only attach AI model when @ai tag is present
    const effectiveAiModelId = isAiTagged
      ? (resolvedAiModelId === NO_AI_MODEL_VALUE ? undefined : resolvedAiModelId)
      : undefined;

    // Strip @ai tag from the content before sending
    const sanitizedContent = isAiTagged ? stripAiTag(content) : content;

    setIsLoading(true);
    try {
      await onSendMessage(sanitizedContent, effectiveAiModelId || undefined, attachedFiles.map((file) => file.id));
      setAttachedFiles([]);
      resetComposer();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('border-t border-border/50 bg-background/50 backdrop-blur-xl transition-all', isCompact ? 'p-2 space-y-2' : 'p-4 space-y-3')}>
      <AiModelSelector
        models={models}
        isCompact={isCompact}
        isDirectChat={isDirectChat}
        value={resolvedAiModelId}
        isLoading={isLoading}
        isAiStreaming={isAiStreaming}
        isAiTagged={isAiTagged}
        showModelPicker={showModelPicker}
        selectedModelName={selectedModelName}
        onChange={handleModelChange}
        onDismiss={dismissModelPicker}
      />

      <AttachedFilesStrip files={attachedFiles} onRemove={removeAttachedFile} />

      <ComposerInput
        isCompact={isCompact}
        allowFileDrop={allowFileDrop}
        isDraggingOver={isDraggingOver}
        isLoading={isLoading}
        isAiStreaming={isAiStreaming}
        content={content}
        attachedCount={attachedFiles.length}
        hasAiModels={hasAiModels}
        isDirectChat={isDirectChat}
        resolvedAiModelId={resolvedAiModelId}
        isAiTagged={isAiTagged}
        selectedModelName={selectedModelName}
        textareaRef={textareaRef}
        onChange={handleContentChange}
        onBlur={() => onTypingChange?.(false)}
        onSubmit={handleSend}
        onCancelStream={onCancelStream}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      />

      {!isCompact ? (
        <div className="text-[10px] text-center text-muted-foreground/40 font-medium">
          AI can make mistakes. Please verify important information.
        </div>
      ) : null}
    </div>
  );
}
