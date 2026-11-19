'use client';

import { useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Braces } from 'lucide-react';

interface JsonViewerProps {
  file: FileItem;
  textContent: string;
  onDownload?: () => void;
}

function JsonTree({ value }: { value: unknown }) {
  if (value === null) return <span className="text-pink-500">null</span>;

  if (typeof value === 'string') {
    return <span className="text-green-600 dark:text-green-400">&quot;{value}&quot;</span>;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sky-600 dark:text-sky-400">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <details open className="pl-4">
        <summary className="cursor-pointer text-xs text-muted-foreground">Array ({value.length})</summary>
        <div className="space-y-1 mt-1">
          {value.map((item, index) => (
            <div key={index} className="text-sm">
              <span className="text-muted-foreground mr-2">[{index}]</span>
              <JsonTree value={item} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <details open className="pl-4">
        <summary className="cursor-pointer text-xs text-muted-foreground">Object ({entries.length})</summary>
        <div className="space-y-1 mt-1">
          {entries.map(([key, nestedValue]) => (
            <div key={key} className="text-sm">
              <span className="text-violet-600 dark:text-violet-400 mr-2">{key}:</span>
              <JsonTree value={nestedValue} />
            </div>
          ))}
        </div>
      </details>
    );
  }

  return <span>{String(value)}</span>;
}

export function JsonViewer({ file, textContent, onDownload }: JsonViewerProps) {
  const [mode, setMode] = useState<'tree' | 'raw'>('tree');

  const parsed = useMemo(() => {
    try {
      return { valid: true as const, value: JSON.parse(textContent) };
    } catch (error) {
      return {
        valid: false as const,
        value: null,
        errorMessage: error instanceof Error ? error.message : 'Invalid JSON',
      };
    }
  }, [textContent]);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="JSON"
        icon={<Braces className="h-4 w-4 text-yellow-500" />}
        onDownload={onDownload}
      >
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant={mode === 'tree' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('tree')}>
            Tree
          </Button>
          <Button type="button" size="sm" variant={mode === 'raw' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('raw')}>
            Raw
          </Button>
        </div>
      </ViewerToolbar>

      <ScrollArea className="flex-1 bg-muted/20">
        {mode === 'raw' || !parsed.valid ? (
          <div className="p-6 space-y-3">
            {!parsed.valid ? <p className="text-sm text-destructive">{parsed.errorMessage}</p> : null}
            <pre className="font-mono text-sm whitespace-pre-wrap wrap-break-word">{textContent}</pre>
          </div>
        ) : (
          <div className="p-6 font-mono text-sm">
            <JsonTree value={parsed.value} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
