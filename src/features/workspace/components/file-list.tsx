'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileItem } from '@/src/lib/types';
import { useWorkspace } from '../workspace-context';
import { File, FileCode, FileImage, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileListProps {
  files: FileItem[];
  onRenameFile?: (fileId: string, newName: string) => void;
  onDeleteFile?: (fileId: string) => void;
}

export function FileList({ files, onRenameFile, onDeleteFile }: FileListProps) {
  const { selectedFileId } = useWorkspace();
  const router = useRouter();
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const getIcon = (contentType: string) => {
    if (contentType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (contentType.includes('image')) return <FileImage className="h-4 w-4 text-purple-500" />;
    if (contentType.includes('json') || contentType.includes('code')) return <FileCode className="h-4 w-4 text-yellow-500" />;
    return <File className="h-4 w-4 text-blue-500" />;
  };

  const handleStartRename = (file: FileItem) => {
    setEditingFileId(file.id);
    setNewName(file.originalName);
  };

  const handleFinishRename = () => {
    if (editingFileId && newName.trim()) {
      onRenameFile?.(editingFileId, newName.trim());
    }
    setEditingFileId(null);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename();
    } else if (e.key === 'Escape') {
      setEditingFileId(null);
    }
  };

  return (
    <div className="space-y-0.5 py-1">
      {files.map((file) => (
        <div
          key={file.id}
          className={`
            group flex items-center justify-between rounded-md px-2 py-1.5 text-sm 
            hover:bg-accent/50 cursor-pointer transition-colors
            ${selectedFileId === file.id ? 'bg-accent text-accent-foreground' : ''}
          `}
          onClick={() => router.push(`/app/workspace/${file.id}`)}
        >
          {editingFileId === file.id ? (
            <div className="flex items-center flex-1 gap-2">
              <span className="shrink-0">{getIcon(file.contentType)}</span>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={handleKeyDown}
                className="h-7 text-xs"
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="shrink-0">{getIcon(file.contentType)}</span>
                <span className="truncate text-sm">{file.originalName}</span>
              </div>

              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-background">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartRename(file); }}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDeleteFile?.(file.id); }}
                        className="text-red-500 focus:text-red-500 focus:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

