'use client';

import { useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCode2 } from 'lucide-react';

interface MarkdownViewerProps {
  file: FileItem;
  textContent: string;
  onDownload?: () => void;
}

export function MarkdownViewer({ file, textContent, onDownload }: MarkdownViewerProps) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const lines = useMemo(() => textContent.split(/\r?\n/), [textContent]);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="Markdown"
        icon={<FileCode2 className="h-4 w-4 text-yellow-500" />}
        onDownload={onDownload}
      >
        <div className="flex items-center rounded-lg border border-border/50 p-0.5 bg-muted/50">
          <Button
            type="button"
            size="sm"
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setMode('preview')}
          >
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'source' ? 'secondary' : 'ghost'}
            className="h-7 px-2 text-xs"
            onClick={() => setMode('source')}
          >
            Source
          </Button>
        </div>
      </ViewerToolbar>

      <ScrollArea className="flex-1 bg-muted/20">
        {mode === 'source' ? (
          <div className="p-6">
            <pre className="font-mono text-sm whitespace-pre-wrap wrap-break-word">{textContent}</pre>
          </div>
        ) : (
          <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
            {lines.map((line, index) => {
              if (line.startsWith('### ')) return <h3 key={index}>{line.slice(4)}</h3>;
              if (line.startsWith('## ')) return <h2 key={index}>{line.slice(3)}</h2>;
              if (line.startsWith('# ')) return <h1 key={index}>{line.slice(2)}</h1>;
              if (line.startsWith('- ')) return <p key={index}>- {line.slice(2)}</p>;
              if (line.startsWith('> ')) return <blockquote key={index}>{line.slice(2)}</blockquote>;
              if (!line.trim()) return <br key={index} />;
              return <p key={index}>{line}</p>;
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
