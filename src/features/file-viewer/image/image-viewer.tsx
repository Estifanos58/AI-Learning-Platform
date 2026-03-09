'use client';

/**
 * ImageViewer – Viewer component for image files (PNG, JPG, GIF, WebP, SVG …).
 *
 * Extensibility notes:
 *  - Add annotation/markup controls by placing them in <ViewerToolbar> children.
 *  - Add fullscreen toggle, histogram display, or EXIF panel as needed.
 */

import { useState, useCallback } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, FileImage } from 'lucide-react';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;

interface ImageViewerProps {
  file: FileItem;
  /** Object URL or data URL for the image */
  src?: string;
  /** Called when the user clicks the Download button */
  onDownload?: () => void;
}

export function ImageViewer({ file, src, onDownload }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitToScreen, setFitToScreen] = useState(true);

  const zoomIn = () => { setFitToScreen(false); setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))); };
  const zoomOut = () => { setFitToScreen(false); setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))); };
  const rotate = () => setRotation((r) => (r + 90) % 360);
  const toggleFit = useCallback(() => { setFitToScreen((f) => !f); setZoom(1); }, []);

  const zoomPercent = fitToScreen ? 'Fit' : `${Math.round(zoom * 100)}%`;

  // Derive a user-friendly image sub-type label
  const subType = file.contentType.split('/')[1]?.toUpperCase() ?? 'Image';

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge={subType}
        icon={<FileImage className="h-4 w-4 text-purple-500" />}
        onDownload={onDownload}
      >
        <TooltipProvider>
          {/* Zoom controls */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground"
                  onClick={zoomOut}
                  disabled={!fitToScreen && zoom <= ZOOM_MIN}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <span className="text-xs font-medium w-12 text-center text-muted-foreground select-none">
              {zoomPercent}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-background text-muted-foreground hover:text-foreground"
                  onClick={zoomIn}
                  disabled={!fitToScreen && zoom >= ZOOM_MAX}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>

          {/* Rotate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={rotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate 90°</TooltipContent>
          </Tooltip>

          {/* Fit to screen toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={fitToScreen ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={toggleFit}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{fitToScreen ? 'Actual Size' : 'Fit to Screen'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ViewerToolbar>

      {/* Viewport */}
      <div className="flex-1 overflow-auto bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT/50)_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT/20)_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] flex items-center justify-center p-8">
        {src ? (
          <img
            src={src}
            alt={file.originalName}
            aria-label={`${file.originalName}${rotation ? ` (rotated ${rotation} degrees)` : ''}`}
            className="shadow-2xl rounded transition-transform duration-200 max-w-full max-h-full"
            style={{
              transform: `scale(${fitToScreen ? 1 : zoom}) rotate(${rotation}deg)`,
              objectFit: fitToScreen ? 'contain' : undefined,
            }}
          />
        ) : (
          <ImagePlaceholder file={file} />
        )}
      </div>
    </div>
  );
}

function ImagePlaceholder({ file }: { file: FileItem }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="bg-purple-500/10 p-6 rounded-2xl border border-purple-500/20">
        <FileImage className="h-16 w-16 text-purple-400" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{file.originalName}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {file.contentType} · {(file.fileSize / 1024).toFixed(0)} KB
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">Preview not available</p>
      </div>
    </div>
  );
}
