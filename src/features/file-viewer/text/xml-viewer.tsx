'use client';

import { useMemo, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2 } from 'lucide-react';

interface XmlViewerProps {
  file: FileItem;
  textContent: string;
  onDownload?: () => void;
}

function formatXml(xml: string): string {
  const normalized = xml.replace(/>\s*</g, '><').replace(/\r?\n/g, '').trim();
  if (!normalized) return '';

  const tokens = normalized.replace(/</g, '\n<').split('\n').filter(Boolean);
  let indent = 0;

  return tokens
    .map((token) => {
      if (token.startsWith('</')) {
        indent = Math.max(indent - 1, 0);
      }

      const line = `${'  '.repeat(indent)}${token}`;

      if (token.startsWith('<') && !token.startsWith('</') && !token.endsWith('/>') && !token.includes('</')) {
        indent += 1;
      }

      return line;
    })
    .join('\n');
}

export function XmlViewer({ file, textContent, onDownload }: XmlViewerProps) {
  const [mode, setMode] = useState<'formatted' | 'raw'>('formatted');
  const formatted = useMemo(() => formatXml(textContent), [textContent]);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="XML"
        icon={<Code2 className="h-4 w-4 text-yellow-500" />}
        onDownload={onDownload}
      >
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant={mode === 'formatted' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('formatted')}>
            Formatted
          </Button>
          <Button type="button" size="sm" variant={mode === 'raw' ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setMode('raw')}>
            Raw
          </Button>
        </div>
      </ViewerToolbar>

      <ScrollArea className="flex-1 bg-muted/20">
        <div className="p-6">
          <pre className="font-mono text-sm whitespace-pre-wrap wrap-break-word">{mode === 'formatted' ? formatted : textContent}</pre>
        </div>
      </ScrollArea>
    </div>
  );
}
