'use client';

import { Progress } from '@/components/ui/progress';
import { FileUploadStatus } from '@/src/lib/types';

interface UploadOverlayProps {
  uploadStatus: FileUploadStatus | null;
}

export function UploadOverlay({ uploadStatus }: UploadOverlayProps) {
  return (
    <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm m-2 rounded-lg flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
      <p className="text-sm font-medium text-primary">
        {uploadStatus?.phase === 'preparing' && 'Preparing upload...'}
        {uploadStatus?.phase === 'uploading' && 'Uploading files...'}
        {uploadStatus?.phase === 'syncing' && 'Refreshing workspace...'}
      </p>
      {uploadStatus && (
        <>
          <p className="mt-1 max-w-52 truncate text-center text-xs text-muted-foreground">
            {uploadStatus.currentFileName || 'Selected files'}
          </p>
          <div className="mt-3 w-56 space-y-2">
            <Progress value={uploadStatus.overallProgress} className="h-2" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {uploadStatus.completedFiles}/{uploadStatus.totalFiles} complete
              </span>
              <span>{uploadStatus.overallProgress}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
