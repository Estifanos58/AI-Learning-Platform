'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Folder, FileItem as FTFileItem } from '@/src/lib/types';
import {
  ChevronRight,
  ChevronDown,
  Folder as FolderIcon,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  UploadCloud,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WorkspaceFileIcon } from './workspace-file-icon';

const WORKSPACE_CHAT_FILE_MIME = 'application/x-workspace-file';

export interface FolderTreeItemProps {
  folder: Folder;
  allFolders: Folder[];
  files: FTFileItem[];
  selectedFolderId: string | null;
  level: number;
  onSelect: (id: string) => void;
  onEdit?: (folder: Folder) => void;
  onDelete?: (id: string) => void;
  onCreateSub?: (parentId: string) => void;
  onSelectFile?: (file: FTFileItem) => void;
  onDeleteFile?: (fileId: string) => void;
  onEditFile?: (file: FTFileItem) => void;
  isCompact?: boolean;
  onFolderDrop?: (folderId: string, files: File[]) => void;
}

export function FolderTreeItem({
  folder,
  allFolders,
  files,
  selectedFolderId,
  level,
  onSelect,
  onEdit,
  onDelete,
  onCreateSub,
  onSelectFile,
  onDeleteFile,
  onEditFile,
  isCompact,
  onFolderDrop,
}: FolderTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const subFolders = allFolders.filter((candidate) => candidate.parentId === folder.id);
  const folderFiles = files.filter((candidate) => candidate.folderId === folder.id);
  const hasContent = subFolders.length > 0 || folderFiles.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
    if (!isExpanded && hasContent) {
      setIsExpanded(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0 && onFolderDrop) {
      onFolderDrop(folder.id, droppedFiles);
    }
  };

  const content = (
    <div
      className={cn(
        'group flex items-center gap-1.5 rounded-md py-1 px-2 text-sm hover:bg-accent/50 cursor-pointer transition-all relative min-h-9',
        isSelected && 'bg-accent text-accent-foreground',
        isDragOver && 'bg-primary/10 ring-2 ring-primary ring-inset scale-[1.01]',
        isCompact && 'justify-center px-0 mx-1'
      )}
      style={{ paddingLeft: isCompact ? '0px' : `${Math.max(8, level * 16 + 8)}px` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(folder.id);
        if (hasContent && !isExpanded) {
          setIsExpanded(true);
        }
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded((value) => !value);
        }}
        className={cn(
          'h-4 w-4 shrink-0 rounded-sm hover:bg-muted-foreground/20 flex items-center justify-center transition-transform',
          !hasContent && 'invisible',
          isCompact && 'hidden'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 opacity-70" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-70" />
        )}
      </button>

      {isDragOver ? (
        <UploadCloud className={cn('h-4 w-4 text-primary shrink-0 animate-bounce', isCompact && 'h-5 w-5')} />
      ) : isExpanded ? (
        <FolderOpen className={cn('h-4 w-4 text-blue-500 shrink-0 transition-transform duration-200', isSelected && 'text-foreground', isCompact && 'h-5 w-5')} />
      ) : (
        <FolderIcon className={cn('h-4 w-4 text-blue-500 shrink-0 transition-transform duration-200', isSelected && 'text-foreground', isCompact && 'h-5 w-5')} />
      )}

      {!isCompact && (
        <span className={cn('truncate flex-1 font-medium ml-1 transition-all duration-300', isDragOver && 'text-primary font-semibold')}>
          {folder.name}
          {isDragOver ? <span className="ml-1.5 text-xs font-normal opacity-70">Drop here</span> : null}
        </span>
      )}

      <div className={cn('opacity-0 group-hover:opacity-100 transition-opacity', !isCompact && 'absolute right-1', isCompact && 'hidden')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-background/80"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-3 w-3" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onCreateSub?.(folder.id);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onEdit?.(folder);
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(folder.id);
              }}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="select-none">
      {isCompact ? (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{folder.name}{isDragOver ? ' - Drop here' : ''}</p>
          </TooltipContent>
        </Tooltip>
      ) : content}

      {isExpanded ? (
        <div className="flex flex-col relative">
          {!isCompact && level > 0 ? (
            <div
              className="absolute left-[calc(var(--padding)-12px)] top-0 bottom-0 w-px bg-border/50"
              style={{ '--padding': `${level * 16 + 8}px` } as React.CSSProperties}
            />
          ) : null}

          {subFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              allFolders={allFolders}
              files={files}
              selectedFolderId={selectedFolderId}
              level={level + 1}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSub={onCreateSub}
              onSelectFile={onSelectFile}
              onDeleteFile={onDeleteFile}
              onEditFile={onEditFile}
              isCompact={isCompact}
              onFolderDrop={onFolderDrop}
            />
          ))}

          {folderFiles.map((file) => {
            const fileContent = (
              <div
                key={file.id}
                className={cn(
                  'group flex items-center gap-2 py-1 px-2 text-sm hover:bg-accent/50 cursor-pointer transition-colors min-h-8 relative rounded-md',
                  isCompact && 'justify-center px-0 mx-1 flex-col h-auto py-2 gap-1 mb-1'
                )}
                style={{ paddingLeft: isCompact ? '0px' : `${Math.max(8, (level + 1) * 16 + 28)}px` }}
                draggable
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData(
                    WORKSPACE_CHAT_FILE_MIME,
                    JSON.stringify({
                      id: file.id,
                      originalName: file.originalName,
                      contentType: file.contentType,
                    }),
                  );
                  event.dataTransfer.setData('text/plain', file.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFile?.(file);
                }}
              >
                <span className={cn('flex items-center justify-center', isCompact && 'text-foreground')}>
                  <WorkspaceFileIcon contentType={file.contentType} />
                </span>

                {!isCompact ? (
                  <span className="truncate flex-1 text-muted-foreground group-hover:text-foreground transition-colors text-xs font-medium">
                    {file.originalName}
                  </span>
                ) : null}

                {!isCompact ? (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center absolute right-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-background/80">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEditFile?.(file);
                        }}>
                          <Pencil className="mr-2 h-3 w-3" />
                          Update File
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile?.(file.id);
                          }}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
            );

            return isCompact ? (
              <Tooltip key={file.id}>
                <TooltipTrigger asChild>{fileContent}</TooltipTrigger>
                <TooltipContent side="right">
                  <p>{file.originalName}</p>
                </TooltipContent>
              </Tooltip>
            ) : fileContent;
          })}
        </div>
      ) : null}
    </div>
  );
}