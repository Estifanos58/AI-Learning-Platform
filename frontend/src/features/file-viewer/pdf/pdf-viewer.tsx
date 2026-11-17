'use client';

/**
 * PdfViewer – Viewer component for PDF files.
 *
 * Extensibility notes:
 *  - Add page navigation, rotation, text-search, or annotation controls by
 *    placing them in <ViewerToolbar> children.
 *  - Replace the <iframe> embed with a full pdfjs-dist renderer when
 *    the pdfjs-dist package is installed.
 */

import { useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, Search, FileText } from 'lucide-react';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

interface PdfViewerProps {
  file: FileItem;
  /** Optional pre-built object / data URL for the PDF content */
  src?: string;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
}

export function PdfViewer({ file, src, onDownload }: PdfViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showSearch, setShowSearch] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="PDF"
        icon={<FileText className="h-4 w-4 text-red-500" />}
        onDownload={onDownload}
      >
        {/* PDF-specific controls */}
        <TooltipProvider>
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground"
                  onClick={zoomOut}
                  disabled={zoom <= ZOOM_MIN}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <span className="text-xs font-medium w-12 text-center text-muted-foreground select-none">
              {zoomPercent}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground"
                  onClick={zoomIn}
                  disabled={zoom >= ZOOM_MAX}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showSearch ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
                onClick={() => setShowSearch((s) => !s)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search in Document</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ViewerToolbar>

      {/* Optional search bar */}
      {showSearch && (
        <div className="px-4 py-2 border-b border-border/50 bg-background/60 flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            placeholder="Search in document…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

      {/* Viewport */}
      <div className="flex-1 overflow-auto bg-gray-50/50 dark:bg-black/20 flex items-start justify-center p-8">
        <div
          className="transition-transform duration-200 origin-top w-full max-w-3xl"
          style={{ transform: `scale(${zoom})` }}
        >
          {src ? (
            /* Real PDF embed — displayed when a data/object URL is provided */
            <iframe
              src={src}
              title={file.originalName}
              aria-label={`PDF document: ${file.originalName}`}
              className="w-full min-h-[800px] rounded-sm shadow-2xl border border-border/10"
            />
          ) : (
            /* Placeholder content shown while no binary data is available */
            <PdfPlaceholder file={file} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Placeholder rendered when no src URL is available yet */
function PdfPlaceholder({ file }: { file: FileItem }) {
  return (
    <div className="bg-white dark:bg-zinc-900 shadow-2xl rounded-sm min-h-[800px] relative flex flex-col items-center p-12 lg:p-16 border border-border/10">
      <div className="w-full space-y-8 animate-in fade-in duration-700">
        {/* Document header */}
        <div className="space-y-4 text-center pb-8 border-b border-gray-100 dark:border-zinc-700">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <FileText className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-zinc-100">
            {file.originalName.replace(/\.pdf$/i, '')}
          </h1>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
            PDF Document · {(file.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        {/* Simulated body lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-full bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" style={{ width: `${80 + (i % 3) * 7}%` }} />
            <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" style={{ width: `${88 + (i % 2) * 5}%` }} />
          </div>
        ))}

        {/* Simulated image block */}
        <div className="py-6">
          <div className="h-48 w-full rounded-md bg-gray-50 dark:bg-zinc-800 animate-pulse" />
          <div className="flex justify-center mt-2">
            <div className="h-3 w-32 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 text-xs text-gray-400 font-medium">Page 1</div>
    </div>
  );
}
