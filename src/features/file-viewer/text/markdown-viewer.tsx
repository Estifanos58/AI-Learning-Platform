'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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
          <div className="p-6 max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0 pb-2 border-b border-border">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-semibold mb-3 mt-5 first:mt-0 pb-1 border-b border-border/50">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-semibold mb-2 mt-4">{children}</h3>,
                h4: ({ children }) => <h4 className="text-lg font-medium mb-2 mt-3">{children}</h4>,
                h5: ({ children }) => <h5 className="text-base font-medium mb-1 mt-2">{children}</h5>,
                h6: ({ children }) => <h6 className="text-sm font-medium mb-1 mt-2 text-muted-foreground">{children}</h6>,
                p: ({ children }) => <p className="mb-4 leading-7 last:mb-0">{children}</p>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:text-primary/80">
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-7">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="mb-4 border-l-4 border-border pl-4 italic text-muted-foreground">{children}</blockquote>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = className?.startsWith('language-');
                  if (isBlock) {
                    return (
                      <code
                        className={`block p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto whitespace-pre ${className ?? ''}`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="mb-4 rounded-md overflow-hidden">{children}</pre>,
                table: ({ children }) => (
                  <div className="mb-4 overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm border-collapse">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
                th: ({ children }) => <th className="px-4 py-2 text-left font-medium">{children}</th>,
                td: ({ children }) => <td className="px-4 py-2">{children}</td>,
                hr: () => <hr className="my-6 border-border" />,
                img: ({ src, alt }) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={src} alt={alt ?? ''} className="max-w-full h-auto rounded-md my-4" />
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {textContent}
            </ReactMarkdown>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
