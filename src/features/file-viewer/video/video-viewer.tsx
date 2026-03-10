'use client';

import { useMemo, useRef, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FastForward, Rewind, PlayCircle } from 'lucide-react';

interface VideoViewerProps {
  file: FileItem;
  src?: string;
  onDownload?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

export function VideoViewer({ file, src, onDownload }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const currentRateIndex = useMemo(() => PLAYBACK_RATES.findIndex((value) => value === playbackRate), [playbackRate]);

  const seekBy = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + seconds);
  };

  const cyclePlaybackRate = () => {
    if (!videoRef.current) return;
    const nextIndex = (currentRateIndex + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIndex];
    videoRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="Video"
        icon={<PlayCircle className="h-4 w-4 text-pink-500" />}
        onDownload={onDownload}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => seekBy(-10)}
              >
                <Rewind className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back 10s</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => seekBy(10)}
              >
                <FastForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward 10s</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-2 text-xs"
                onClick={cyclePlaybackRate}
              >
                {playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change playback speed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ViewerToolbar>

      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-muted/20">
        {src ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video
            ref={videoRef}
            src={src}
            controls
            preload="metadata"
            aria-label={file.originalName}
            className="max-w-full max-h-full rounded-xl shadow-2xl border border-border/40"
          />
        ) : (
          <div className="text-center text-muted-foreground text-sm">Video preview is not available.</div>
        )}
      </div>
    </div>
  );
}
