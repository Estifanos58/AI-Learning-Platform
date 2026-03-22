'use client';

import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FolderPlus, UploadCloud, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarToolbarProps {
  isCompact: boolean;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickFiles: () => void;
  onOpenCreateFolder: () => void;
  onNewAiChat: () => void;
}

export function SidebarToolbar({
  isCompact,
  isUploading,
  fileInputRef,
  onFileInputChange,
  onPickFiles,
  onOpenCreateFolder,
  onNewAiChat,
}: SidebarToolbarProps) {
  return (
    <>
      <div
        className={cn(
          'border-b border-border flex items-center sticky top-0 bg-card/95 backdrop-blur z-10 h-14 transition-all duration-300 ease-in-out',
          isCompact ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        {!isCompact && (
          <span className="font-semibold text-sm tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
            Workspace
          </span>
        )}
        <div className="flex gap-1">
          <input type="file" ref={fileInputRef} onChange={onFileInputChange} className="hidden" multiple />
          {isCompact ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                    onClick={() => !isUploading && onPickFiles()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : (
                      <UploadCloud className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>{isUploading ? 'Uploading...' : 'Upload Files'}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                    onClick={() => onOpenCreateFolder()}
                  >
                    <FolderPlus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>New Root Folder</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                onClick={() => !isUploading && onPickFiles()}
                title={isUploading ? 'Uploading...' : 'Upload Files'}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                onClick={() => onOpenCreateFolder()}
                title="New Root Folder"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!isCompact ? (
        <div className="border-b border-border/50 p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs justify-start px-2 gap-2"
            onClick={onNewAiChat}
          >
            <Sparkles className="h-3.5 w-3.5" />
            New AI Chat
          </Button>
        </div>
      ) : (
        <div className="border-b border-border/50 p-1 flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                onClick={onNewAiChat}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p>New AI Chat</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
}
