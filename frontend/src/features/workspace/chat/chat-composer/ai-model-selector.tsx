import { useRef, useEffect, useMemo, useState } from 'react';
import { Sparkles, Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIModel } from '@/src/lib/types';
import { NO_AI_MODEL_VALUE } from './types';

interface AiModelSelectorProps {
  models: AIModel[];
  isCompact?: boolean;
  isDirectChat: boolean;
  value: string;
  isLoading: boolean;
  isAiStreaming: boolean;
  isAiTagged: boolean;
  showModelPicker: boolean;
  selectedModelName: string | null;
  onChange: (nextModelId: string) => void;
  onDismiss: () => void;
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
  isAiTagged,
  showModelPicker,
  selectedModelName,
  onChange,
  onDismiss,
}: AiModelSelectorProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [filterText, setFilterText] = useState('');

  // Close popover on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelPicker, onDismiss]);

  // Reset filter when picker opens/closes
  useEffect(() => {
    if (!showModelPicker) setFilterText('');
  }, [showModelPicker]);

  const filteredModels = useMemo(() => {
    if (!filterText.trim()) return models;
    const lower = filterText.toLowerCase();
    return models.filter((m) => {
      const name = getModelName(m).toLowerCase();
      const provider = (m.provider || '').toLowerCase();
      return name.includes(lower) || provider.includes(lower);
    });
  }, [models, filterText]);

  if (models.length === 0) return null;

  // When @ai is tagged, show the inline AI badge + picker
  if (isAiTagged) {
    return (
      <div className="relative">
        {/* Active AI badge */}
        <button
          type="button"
          onClick={() => (showModelPicker ? onDismiss() : onChange(value))}
          disabled={isLoading || isAiStreaming}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer',
            isCompact ? 'px-2 py-0.5' : 'px-2.5 py-1',
            'border-primary/40 bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary',
            'hover:border-primary/60 hover:from-primary/15 hover:to-violet-500/15',
            'shadow-sm shadow-primary/10',
          )}
        >
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
          <span>{selectedModelName || 'Select model'}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', showModelPicker && 'rotate-180')} />
        </button>

        {/* Floating model picker popover */}
        {showModelPicker && (
          <div
            ref={popoverRef}
            className={cn(
              'absolute bottom-full left-0 mb-2 z-50',
              'w-72 max-h-80 overflow-hidden',
              'bg-popover/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-2xl shadow-black/20',
              'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
            )}
          >
            {/* Header */}
            <div className="px-3 pt-3 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Select AI Model</span>
              </div>
              {/* Search filter */}
              {models.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Search models..."
                    className="w-full pl-7 pr-2 py-1.5 text-xs bg-muted/50 border border-border/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Model list */}
            <div className="overflow-y-auto max-h-56 py-1">
              {isDirectChat && (
                <button
                  type="button"
                  onClick={() => onChange(NO_AI_MODEL_VALUE)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                    'hover:bg-muted/60',
                    value === NO_AI_MODEL_VALUE && 'bg-primary/5',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground">None (direct message only)</div>
                  </div>
                  {value === NO_AI_MODEL_VALUE && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              )}
              {filteredModels.map((model) => {
                const modelId = getModelId(model);
                const modelName = getModelName(model);
                const isSelected = modelId === value;
                const isDisabled = model.platformKeyAvailable === false && !model.userKeyConfigured;

                return (
                  <button
                    type="button"
                    key={modelId}
                    onClick={() => !isDisabled && onChange(modelId)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                      'hover:bg-muted/60',
                      isSelected && 'bg-primary/5',
                      isDisabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center h-7 w-7 rounded-lg text-[10px] font-bold shrink-0',
                      isSelected
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted/80 text-muted-foreground border border-border/40',
                    )}>
                      {(model.provider || modelName).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-xs font-medium truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                        {modelName}
                      </div>
                      {model.provider && (
                        <div className="text-[10px] text-muted-foreground/70 truncate">{model.provider}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    {isDisabled && (
                      <span className="text-[9px] text-amber-500 shrink-0 font-medium">Key needed</span>
                    )}
                  </button>
                );
              })}
              {filteredModels.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">No models found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // When NOT tagged: show nothing (user needs to type @ai to trigger)
  return null;
}
