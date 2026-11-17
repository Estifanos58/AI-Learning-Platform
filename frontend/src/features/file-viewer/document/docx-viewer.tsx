'use client';

/**
 * DocxViewer – Viewer for DOCX / DOC files using mammoth.js.
 *
 * mammoth converts DOCX binary data to clean HTML which is then
 * rendered inline.  Messages/warnings from mammoth are available
 * for debugging but are not shown in the UI.
 */

import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocxViewerProps {
  file: FileItem;
  /** Object-URL of the DOCX binary (created from the fetched blob) */
  src?: string;
  onDownload?: () => void;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error'; message: string };

export function DocxViewer({ file, src, onDownload }: DocxViewerProps) {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    if (!src) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        if (cancelled) return;

        const result = await mammoth.convertToHtml({ arrayBuffer });

        if (cancelled) return;

        setState({ status: 'ready', html: result.value });
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to render document',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  const ext = file.originalName.split('.').pop()?.toLowerCase() ?? '';
  const label = ext === 'docx' ? 'DOCX' : ext === 'doc' ? 'DOC' : 'Document';

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge={label}
        icon={<FileText className="h-4 w-4 text-blue-500" />}
        onDownload={onDownload}
      />

      <div className="flex-1 overflow-hidden">
        {state.status === 'loading' && (
          <div className="h-full flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Rendering document…</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="bg-destructive/10 p-4 rounded-full border border-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Failed to render document</p>
              <p className="text-sm text-muted-foreground">{state.message}</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={onDownload}>
              <Download className="h-4 w-4" />
              Download instead
            </Button>
          </div>
        )}

        {state.status === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
              <FileText className="h-14 w-14 text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{file.originalName}</p>
              <p className="text-sm text-muted-foreground">
                {label} Document · {(file.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">Loading preview…</p>
            </div>
          </div>
        )}

        {state.status === 'ready' && (
          <ScrollArea className="h-full bg-muted/10">
            <div className="flex justify-center px-6 py-8">
              <div
                className="w-full max-w-3xl bg-white dark:bg-zinc-900 shadow-xl rounded border border-border/20 px-12 py-14 min-h-[900px]"
                /* mammoth produces safe HTML from docx – no user-controlled scripts */
                /* eslint-disable-next-line react/no-danger */
                dangerouslySetInnerHTML={{ __html: state.html }}
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  color: 'inherit',
                }}
              />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
