'use client';

import { useMemo, useRef, useState } from 'react';
import { FileItem } from '@/src/lib/types';
import { ViewerToolbar } from '../viewer-toolbar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Music2, Volume2 } from 'lucide-react';

interface AudioViewerProps {
  file: FileItem;
  src?: string;
  onDownload?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];
const VOLUMES = [0.25, 0.5, 0.75, 1];

export function AudioViewer({ file, src, onDownload }: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);

  const rateIndex = useMemo(() => PLAYBACK_RATES.findIndex((value) => value === playbackRate), [playbackRate]);
  const volumeIndex = useMemo(() => VOLUMES.findIndex((value) => value === volume), [volume]);

  const cycleRate = () => {
    if (!audioRef.current) return;
    const nextIndex = (rateIndex + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIndex];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const cycleVolume = () => {
    if (!audioRef.current) return;
    const nextIndex = (volumeIndex + 1) % VOLUMES.length;
    const nextVolume = VOLUMES[nextIndex];
    audioRef.current.volume = nextVolume;
    setVolume(nextVolume);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <ViewerToolbar
        file={file}
        badge="Audio"
        icon={<Music2 className="h-4 w-4 text-indigo-500" />}
        onDownload={onDownload}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={cycleRate}>
                {playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change playback speed</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={cycleVolume}>
                <Volume2 className="h-4 w-4 mr-1" />
                {Math.round(volume * 100)}%
              </Button>
            </TooltipTrigger>
            <TooltipContent>Change volume</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </ViewerToolbar>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-muted/20">
        {src ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio
            ref={audioRef}
            src={src}
            controls
            preload="metadata"
            aria-label={file.originalName}
            className="w-full max-w-2xl"
          />
        ) : (
          <div className="text-center text-muted-foreground text-sm">Audio preview is not available.</div>
        )}
      </div>
    </div>
  );
}
