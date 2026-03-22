import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIModel } from '@/src/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NO_AI_MODEL_VALUE } from './types';

interface AiModelSelectorProps {
  models: AIModel[];
  isCompact?: boolean;
  isDirectChat: boolean;
  value: string;
  isLoading: boolean;
  isAiStreaming: boolean;
  onChange: (nextModelId: string) => void;
}

const getModelId = (model?: AIModel | null) => model?.id || model?.modelId || '';
const getModelName = (model?: AIModel | null) => model?.name || model?.modelName || '';

export function AiModelSelector({
  models,
  isCompact,
  isDirectChat,
  value,
  isLoading,
  isAiStreaming,
  onChange,
}: AiModelSelectorProps) {
  if (models.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between', !isCompact && 'pb-2')}>
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-full border border-border/50',
          isCompact ? 'px-1.5 py-0.5' : 'px-2 py-1',
          value !== NO_AI_MODEL_VALUE && 'border-primary/30 bg-primary/5',
        )}
      >
        <Sparkles className={cn('h-3 w-3', value !== NO_AI_MODEL_VALUE ? 'text-primary' : 'text-muted-foreground')} />
        <span>{isDirectChat ? 'AI Assist:' : 'Model:'}</span>
        <Select value={value} onValueChange={onChange} disabled={isLoading || isAiStreaming}>
          <SelectTrigger
            className={cn(
              'border-none bg-transparent hover:bg-accent focus:ring-0 p-0 px-1 gap-1 text-xs w-auto min-w-20',
              isCompact ? 'h-4' : 'h-5',
            )}
          >
            <SelectValue placeholder={isDirectChat ? 'None' : 'Select model'} />
          </SelectTrigger>
          <SelectContent>
            {isDirectChat ? <SelectItem value={NO_AI_MODEL_VALUE}>None (direct message only)</SelectItem> : null}
            {models.map((model) => (
              <SelectItem
                key={getModelId(model)}
                value={getModelId(model)}
                className="text-xs"
                disabled={model.platformKeyAvailable === false && !model.userKeyConfigured}
              >
                {getModelName(model)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
