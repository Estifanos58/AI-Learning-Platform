'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Folder, FileItem } from '@/src/lib/types';
import { fileMockService } from '@/src/lib/mocks';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { FolderTree } from './folder-tree';
import { LoadingState, EmptyState } from '@/src/components/common/states';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FolderPlus, UploadCloud, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LeftSidebarProps {
  isOpen: boolean;
}

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const { user } = useAuth();
  const { selectedFolderId, setSelectedFolderId, setSelectedFileId, leftSidebarWidth } = useWorkspace();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compact mode check (approx mobile width breakpoint)
  const isCompact = leftSidebarWidth < 240;
  
  // Modal States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [folderFormName, setFolderFormName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Load content
  const loadContent = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Load Folders
      const foldersResult = await fileMockService.listMyFolders(user.id);
      setFolders(foldersResult);
      
      // 2. Load Files for each folder
      const filePromises = foldersResult.map(folder => 
        fileMockService.listMyFiles(user.id, folder.id).catch(() => [])
      );
      
      const filesResults = await Promise.all(filePromises);
      const allFiles = filesResults.flat();
      
      setFiles(allFiles);

    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // --- Handlers ---

  const handleCreateFolder = async () => {
    if (!user?.id || !folderFormName.trim()) return;
    setIsSubmitting(true);
    try {
      await fileMockService.createFolder(user.id, {
        name: folderFormName,
        parentId: createParentId,
      });
      await loadContent();
      setIsCreateFolderOpen(false);
      setFolderFormName('');
      toast.success("Folder created successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFolder = async () => {
    if (!user?.id || !folderToEdit || !folderFormName.trim()) return;
    setIsSubmitting(true);
    try {
      await fileMockService.updateFolder(user.id, folderToEdit.id, {
        name: folderFormName
      });
      await loadContent();
      setIsEditFolderOpen(false);
      setFolderFormName('');
      setFolderToEdit(null);
      toast.success("Folder updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to delete this folder? All files inside will be deleted.")) return;
    
    try {
      await fileMockService.deleteFolder(user.id, folderId);
      await loadContent();
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success("Folder deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete folder");
    }
  };

  // --- File Handlers (Mock implementation) ---

  const handleSelectFile = (file: FileItem) => {
      setSelectedFileId(file.id);
      // Optional: Maybe select the folder too?
      if (file.folderId) {
          setSelectedFolderId(file.folderId);
      }
  };

  const handleDeleteFile = async (fileId: string) => {
      // Since mock service doesn't have deleteFile yet, we simulate locally
      if (!confirm("Are you sure you want to delete this file?")) return;
      
      // In real implementation: await fileMockService.deleteFile(user.id, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success("File deleted");
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
      // In real implementation: await fileMockService.renameFile(...)
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, originalName: newName } : f));
      toast.success("File renamed");
  };

  // --- Modal Triggers ---

  const openCreateModal = (parentId?: string) => {
      setCreateParentId(parentId);
      setFolderFormName('');
      setIsCreateFolderOpen(true);
  };

  const openEditModal = (folder: Folder) => {
      setFolderToEdit(folder);
      setFolderFormName(folder.name);
      setIsEditFolderOpen(true);
  };

  // --- Drag and Drop ---
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;
      
      await handleUploadFiles(droppedFiles);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const filesArray = Array.from(e.target.files);
          await handleUploadFiles(filesArray);
      }
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleUploadFiles = async (filesToUpload: File[]) => {
      // Determine target folder: default to selectedFolderId, or first folder
      let targetFolderId = selectedFolderId;
      if (!targetFolderId) {
          if (folders.length > 0) {
             targetFolderId = folders[0].id;
          } else {
             toast.error("Please create or select a folder to upload files into.");
             return;
          }
      }

      toast.info(`Uploading ${filesToUpload.length} file(s)...`);
      
      try {
          if (!user?.id) return;

          const newFiles: FileItem[] = [];

          for (const file of filesToUpload) {
              const newFile = await fileMockService.uploadFile(user.id, {
                  folderId: targetFolderId!,
                  fileType: 'DOCUMENT',
                  originalName: file.name,
                  contentType: file.type,
                  fileSize: file.size
              });
              newFiles.push(newFile);
          }
          
          await loadContent();
          toast.success("Files uploaded");
      } catch(err) {
          console.error(err);
          toast.error("Upload failed");
      }
  };


  return (
    <aside
      className="bg-card/50 backdrop-blur-xl border-r border-border flex flex-col overflow-hidden w-full h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Drag Overlay */}
        {isDragging && (
            <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed m-2 rounded-lg flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                <UploadCloud className="h-12 w-12 text-primary mb-2" />
                <p className="font-semibold text-primary">Drop files to upload</p>
            </div>
        )}

        {/* Header */}
        <div className={cn(
             "border-b border-border flex items-center sticky top-0 bg-card/95 backdrop-blur z-10 h-14 transition-all duration-300 ease-in-out",
             isCompact ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!isCompact && (
            <span className="font-semibold text-sm tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
                Workspace
            </span>
          )}
          <div className="flex gap-1">
             <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
             {isCompact ? (
               <>
               <Tooltip>
                 <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadCloud className="h-5 w-5" />
                    </Button>
                 </TooltipTrigger>
                 <TooltipContent side="right" sideOffset={10}>
                    <p>Upload Files</p>
                 </TooltipContent>
               </Tooltip>
               
               <Tooltip>
                 <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                        onClick={() => openCreateModal()}
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
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Files"
                >
                    <UploadCloud className="h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                    onClick={() => openCreateModal()}
                    title="New Root Folder"
                >
                    <FolderPlus className="h-4 w-4" />
                </Button>
                </>
             )}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCompact ? 'p-1' : 'p-2'}`}>
            {isLoading ? (
                <div className="space-y-3 px-2 mt-4">
                    <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-1/2 bg-muted rounded animate-pulse pl-4" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
            ) : folders.length === 0 ? (
                <div className="mt-8 px-4">
                    <EmptyState
                        icon="📁"
                        title={isCompact ? "" : "No Folders"}
                        description={isCompact ? "Empty" : "Create a folder to start organizing"}
                        action={{
                            label: "New Folder",
                            onClick: () => openCreateModal()
                        }}
                    />
                </div>
            ) : (
                <FolderTree
                    folders={folders}
                    files={files}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    onEditFolder={openEditModal}
                    onDeleteFolder={handleDeleteFolder}
                    onCreateSubfolder={openCreateModal}
                    onSelectFile={handleSelectFile}
                    onDeleteFile={handleDeleteFile}
                    onRenameFile={handleRenameFile}
                    isCompact={isCompact}
                />
            )}
        </div>
      </div>

      {/* Create Folder Modal */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{createParentId ? "New Subfolder" : "New Folder"}</DialogTitle>
                <DialogDescription>
                    {createParentId ? "Create a folder inside the selected folder." : "Create a root folder in your workspace."}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="folderName">Folder Name</Label>
                <Input 
                    id="folderName" 
                    value={folderFormName} 
                    onChange={(e) => setFolderFormName(e.target.value)}
                    placeholder="e.g., Project Docs"
                    className="mt-2"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder();
                    }}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={isSubmitting || !folderFormName.trim()}>Create</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Modal */}
      <Dialog open={isEditFolderOpen} onOpenChange={setIsEditFolderOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Rename Folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="editFolderName">Folder Name</Label>
                <Input 
                    id="editFolderName" 
                    value={folderFormName} 
                    onChange={(e) => setFolderFormName(e.target.value)}
                    className="mt-2"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditFolder();
                    }}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditFolderOpen(false)}>Cancel</Button>
                <Button onClick={handleEditFolder} disabled={isSubmitting || !folderFormName.trim()}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

