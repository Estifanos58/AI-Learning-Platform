'use client';

/**
 * ViewerToolbar – Shared extensible toolbar base for all file viewers.
 *
 * Usage:
 *   <ViewerToolbar file={file} icon={<PdfIcon />} badge="PDF">
 *     {viewer-specific controls go here}
 *   </ViewerToolbar>
 *
 * Extend the toolbar by passing children (right-aligned controls are appended
 * before the universal Download / Share / More buttons).
 */

import { ReactNode } from 'react';
import { FileItem } from '@/src/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Share2, MoreHorizontal, Clock } from 'lucide-react';

export interface ViewerToolbarProps {
  /** The file being displayed */
  file: FileItem;
  /**
   * Icon element rendered in the file-type badge chip.
   * Defaults to a generic file icon if omitted.
   */
  icon?: ReactNode;
  /**
   * Short label shown next to the icon (e.g. "PDF", "Image").
   * Defaults to the raw contentType when omitted.
   */
  badge?: string;
  /**
   * Viewer-specific controls rendered in the toolbar action area,
   * to the left of the universal Download / Share / More buttons.
   */
  children?: ReactNode;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
  /** Called when the user clicks the Share button */
  onShare?: () => void;
  /** Called when the user clicks the More Options button */
  onMore?: () => void;
}

export function ViewerToolbar({
  file,
  icon,
  badge,
  children,
  onDownload,
  onShare,
  onMore,
}: ViewerToolbarProps) {
  const displayBadge = badge ?? file.contentType;

  return (
    <div className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-4 gap-4 sticky top-0 z-10 transition-all shrink-0">
      {/* File Info */}
      <div className="min-w-0 flex items-center gap-3 flex-1">
        {icon && (
          <div className="bg-muted/60 p-1.5 rounded-lg border border-border/50 shrink-0">
            {icon}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <h2 className="text-sm font-semibold truncate leading-none mb-1">{file.originalName}</h2>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-medium uppercase">{displayBadge}</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <TooltipProvider>
          {/* Viewer-specific controls slot */}
          {children && (
            <>
              <div className="flex items-center gap-1">{children}</div>
              <Separator orientation="vertical" className="h-6 mx-1 bg-border/50 hidden sm:block" />
            </>
          )}

          {/* Universal actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Share file"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Download file"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="More options"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onMore}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More Options</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
