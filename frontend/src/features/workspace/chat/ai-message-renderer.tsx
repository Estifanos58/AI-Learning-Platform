'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { BookOpen, Check, Copy } from 'lucide-react';
import { MARKDOWN_SANITIZE_SCHEMA, sanitizeUrl } from '@/src/lib/security/sanitize';
import { cn } from '@/lib/utils';

export interface MessageCitation {
  id?: string;
  fileId?: string;
  fileName?: string;
  title?: string;
  pageNumber?: number;
  snippet?: string;
  score?: number;
}

interface AiMessageRendererProps {
  content: string;
  citations?: MessageCitation[];
  className?: string;
}

function extractTextFromChildren(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromChildren(node.props.children);
  }
  return '';
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const langMatch = className?.match(/language-([a-z0-9_+-]+)/i);
  const language = langMatch ? langMatch[1] : 'text';
  const rawCode = extractTextFromChildren(children).replace(/\n$/, '');

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="my-3 rounded-lg border border-border bg-zinc-950 text-zinc-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400">
        <span className="font-mono uppercase tracking-wide">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 hover:text-zinc-100 transition-colors"
          aria-label="Copy code block"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code className={cn('font-mono', className)}>{children}</code>
      </pre>
    </div>
  );
}

export function AiMessageRenderer({ content, citations, className }: AiMessageRendererProps) {
  return (
    <div className={cn('ai-markdown text-sm leading-relaxed break-words', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA],
          rehypeHighlight,
        ]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2.5 ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 ml-5 list-decimal space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-3 border-primary/40 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => {
            const safeHref = sanitizeUrl(href);
            if (!safeHref) {
              return <span className="underline decoration-dotted">{children}</span>;
            }
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => {
            const child = React.Children.only(children);
            if (React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
              return <CodeBlock className={child.props.className}>{child.props.children}</CodeBlock>;
            }
            return <CodeBlock>{children}</CodeBlock>;
          },
          code: ({ className: codeClass, children, ...props }) => {
            const isBlock = Boolean(codeClass && (codeClass.includes('language-') || codeClass.includes('hljs')));
            if (isBlock) {
              return (
                <code className={cn('font-mono', codeClass)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-background/70 border border-border/50 font-mono text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/80">{children}</thead>,
          tr: ({ children }) => <tr className="border-b border-border/60 last:border-b-0">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-1.5 align-top">{children}</td>,
          hr: () => <hr className="my-3 border-border" />,
          img: ({ src, alt }) => {
            const safeSrc = sanitizeUrl(typeof src === 'string' ? src : undefined);
            if (!safeSrc) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={safeSrc} alt={alt ?? ''} className="max-w-full h-auto rounded-md my-2" />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {citations && citations.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5" data-testid="ai-citations">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span>Sources ({citations.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((citation, index) => {
              const label = citation.title || citation.fileName || citation.fileId || `Source ${index + 1}`;
              return (
                <div
                  key={citation.id || `${label}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background/80 px-2 py-1 text-[11px] text-foreground"
                  title={citation.snippet || label}
                >
                  <span className="font-semibold text-primary">[{index + 1}]</span>
                  <span className="max-w-[200px] truncate">{label}</span>
                  {citation.pageNumber ? (
                    <span className="text-muted-foreground">p.{citation.pageNumber}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
