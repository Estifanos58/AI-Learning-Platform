import { Paperclip, X } from 'lucide-react';
import { AttachedWorkspaceFile } from './types';

interface AttachedFilesStripProps {
  files: AttachedWorkspaceFile[];
  onRemove: (fileId: string) => void;
}

export function AttachedFilesStrip({ files, onRemove }: AttachedFilesStripProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/20 p-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-xs"
        >
          <Paperclip className="h-3 w-3 text-muted-foreground" />
          <span className="max-w-36 truncate">{file.originalName}</span>
          <button
            type="button"
            className="rounded-sm text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(file.id)}
            aria-label="Remove attached file"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
