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
  FileText, 
  File, 
  FileCode, 
  FileImage,
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

interface FolderTreeProps {
  folders: Folder[];
  files: FTFileItem[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folderId: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
  onSelectFile?: (file: FTFileItem) => void;
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  isCompact?: boolean;
}

interface TreeItemProps {
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
  onRenameFile?: (fileId: string, newName: string) => void;
  isCompact?: boolean;
}

const getFileIcon = (contentType: string) => {
    if (contentType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (contentType.includes('image')) return <FileImage className="h-4 w-4 text-purple-500" />;
    if (contentType.includes('json') || contentType.includes('code') || contentType.includes('javascript') || contentType.includes('typescript')) return <FileCode className="h-4 w-4 text-yellow-500" />;
    return <File className="h-4 w-4 text-blue-500" />;
};

function FolderTreeItem({ 
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
  onRenameFile,
  isCompact
}: TreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const subFolders = allFolders.filter(f => f.parentId === folder.id);
  const folderFiles = files.filter(f => f.folderId === folder.id);
  const hasContent = subFolders.length > 0 || folderFiles.length > 0;
  
  const isSelected = selectedFolderId === folder.id;

  const content = (
    <div 
      className={cn(
        "group flex items-center gap-1.5 rounded-md py-1 px-2 text-sm hover:bg-accent/50 cursor-pointer transition-colors relative min-h-[36px]",
        isSelected && "bg-accent text-accent-foreground",
        isCompact && "justify-center px-0 mx-1"
      )}
      style={{ paddingLeft: isCompact ? '0px' : `${Math.max(8, level * 16 + 8)}px` }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(folder.id);
        // Auto-expand on select if it has children and we are not in compact mode (or maybe in compact mode too?)
        if (hasContent && !isExpanded) setIsExpanded(true);
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className={cn(
          "h-4 w-4 shrink-0 rounded-sm hover:bg-muted-foreground/20 flex items-center justify-center transition-transform", 
          !hasContent && "invisible",
          isCompact && "hidden"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 opacity-70" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-70" />
        )}
      </button>

      {isExpanded ? (
        <FolderOpen className={cn("h-4 w-4 text-blue-500 shrink-0 transition-transform duration-200", isSelected && "text-foreground", isCompact && "h-5 w-5")} />
      ) : (
        <FolderIcon className={cn("h-4 w-4 text-blue-500 shrink-0 transition-transform duration-200", isSelected && "text-foreground", isCompact && "h-5 w-5")} />
      )}
      
      {!isCompact && (
          <span className="truncate flex-1 font-medium ml-1 transition-all duration-300">{folder.name}</span>
      )}
      
      {/* Actions Dropdown */}
      <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity", !isCompact && "absolute right-1", isCompact && "hidden")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 p-0 hover:bg-background/80"
              onClick={(e) => {
                  e.stopPropagation();
                  // Don't select when clicking menu
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
      {/* Folder Row */}
      {isCompact ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{folder.name}</p>
          </TooltipContent>
        </Tooltip>
      ) : content}

      {/* Children (Subfolders & Files) */}
      {isExpanded && (
        <div className="flex flex-col relative">
          {/* Visual guide line for hierarchy could be added here */}
          {!isCompact && level > 0 && (
             <div 
                className="absolute left-[calc(var(--padding)-12px)] top-0 bottom-0 w-px bg-border/50" 
                style={{ '--padding': `${level * 16 + 8}px` } as React.CSSProperties} 
             />
          )}

          {/* Render Subfolders first */}
          {subFolders.map(child => (
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
              onRenameFile={onRenameFile}
              isCompact={isCompact}
            />
          ))}

          {/* Render Files */}
          {folderFiles.map(file => {
            const fileContent = (
              <div
                  key={file.id}
                  className={cn(
                      "group flex items-center gap-2 py-1 px-2 text-sm hover:bg-accent/50 cursor-pointer transition-colors min-h-[32px] relative rounded-md",
                      isCompact && "justify-center px-0 mx-1 flex-col h-auto py-2 gap-1 mb-1"
                  )}
                  style={{ paddingLeft: isCompact ? '0px' : `${Math.max(8, (level + 1) * 16 + 28)}px` }}
                  onClick={(e) => {
                      e.stopPropagation();
                      onSelectFile?.(file);
                  }}
              >
                  <span className={cn("flex items-center justify-center", isCompact && "text-foreground")}>
                    {getFileIcon(file.contentType)}
                  </span>
                  
                  {!isCompact && (
                      <span className="truncate flex-1 text-muted-foreground group-hover:text-foreground transition-colors text-xs font-medium">
                          {file.originalName}
                      </span>
                  )}

                  {!isCompact && (
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
                                    onDeleteFile?.(file.id);
                                }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  )}
              </div>
            );

            return isCompact ? (
              <Tooltip key={file.id}>
                <TooltipTrigger asChild>
                   {fileContent}
                </TooltipTrigger>
                <TooltipContent side="right">
                   <p>{file.originalName}</p>
                </TooltipContent>
              </Tooltip>
            ) : fileContent;
          })}
        </div>
      )}
    </div>
  );
}

// Helper to prevent event bubbling issues
const displaySubfolder = (id: string, callback?: (id: string) => void) => {
    if (callback) callback(id);
};


export function FolderTree({
  folders,
  files,
  selectedFolderId,
  onSelectFolder,
  onEditFolder,
  onDeleteFolder,
  onCreateSubfolder,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  isCompact
}: FolderTreeProps) {
  // Filter root folders only
  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="space-y-0.5 py-1">
      {rootFolders.map((folder) => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          allFolders={folders}
          files={files}
          selectedFolderId={selectedFolderId}
          level={0}
          onSelect={onSelectFolder}
          onEdit={onEditFolder}
          onDelete={onDeleteFolder}
          onCreateSub={onCreateSubfolder}
          onSelectFile={onSelectFile}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
          isCompact={isCompact}
        />
      ))}
    </div>
  );
}

