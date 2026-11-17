import { AIModel } from '@/src/lib/types';

export const WORKSPACE_CHAT_FILE_MIME = 'application/x-workspace-file';
export const NO_AI_MODEL_VALUE = '__none__';

export interface AttachedWorkspaceFile {
  id: string;
  originalName: string;
  contentType?: string;
}

export interface ChatComposerProps {
  onSendMessage: (content: string, aiModelId?: string, attachedFileIds?: string[]) => Promise<void>;
  onCancelStream?: () => Promise<void> | void;
  onTypingChange?: (isTyping: boolean) => Promise<void> | void;
  isCompact?: boolean;
  models?: AIModel[];
  allowFileDrop?: boolean;
  selectedAiModelId?: string | null;
  onSelectedAiModelChange?: (modelId: string | null) => void;
  isAiStreaming?: boolean;
  isDirectChat?: boolean;
}
