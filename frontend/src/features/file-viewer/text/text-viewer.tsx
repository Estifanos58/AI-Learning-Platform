'use client';

import { useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlignLeft, WrapText, FileCode2 } from 'lucide-react';

interface TextViewerProps {
  file: FileItem;
  textContent: string;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
}

export function TextViewer({ file, textContent, onDownload }: TextViewerProps) {
  const [wrapLines, setWrapLines] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const lines = textContent.split(/\r?\n/);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="Text"
        icon={<FileCode2 className="h-4 w-4 text-yellow-500" />}
        onDownload={onDownload}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showLineNumbers ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowLineNumbers((value) => !value)}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle line numbers</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={wrapLines ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setWrapLines((value) => !value)}
              >
                <WrapText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle line wrapping</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ViewerToolbar>

      <ScrollArea className="flex-1 bg-muted/20">
        <div className="min-h-full p-4 sm:p-6">
          <pre className={`font-mono text-sm text-foreground ${wrapLines ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre min-w-max'}`}>
            {lines.map((line, index) => (
              <div key={index} className="flex">
                {showLineNumbers ? (
                  <span className="w-12 shrink-0 pr-4 text-right text-xs text-muted-foreground/70 select-none">
                    {index + 1}
                  </span>
                ) : null}
                <span className="flex-1">{line || ' '}</span>
              </div>
            ))}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}