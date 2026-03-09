'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Folder, FileItem, FileUploadStatus } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '../workspace-context';
import { useGatewayFiles } from '@/src/hooks/use-gateway';
import { FolderTree } from './folder-tree';
import { EmptyState } from '@/src/components/common/states';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FolderPlus, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { useWorkspaceFileUpload } from '../use-workspace-file-upload';

interface LeftSidebarProps {
  isOpen: boolean;
}

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const { user, session } = useAuth();
  const { selectedFolderId, setSelectedFolderId, leftSidebarWidth } = useWorkspace();
  const router = useRouter();
  const {
    folders,
    files,
    isLoading,
    error: filesError,
    createFolder,
    updateFolder,
    deleteFolder,
    deleteFile,
    updateFileMetadata,
    uploadFiles,
  } = useGatewayFiles(session?.accessToken);

  // Compact mode check (approx mobile width breakpoint)
  const isCompact = leftSidebarWidth < 240;
  
  // Modal States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [isEditFileOpen, setIsEditFileOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);
  const [fileToEdit, setFileToEdit] = useState<FileItem | null>(null);
  const [folderFormName, setFolderFormName] = useState('');
  const [createParentId, setCreateParentId] = useState<string | undefined>(undefined);
  const [isShareable, setIsShareable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<FileUploadStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const isUploading = uploadStatus !== null;

  const { uploadIntoWorkspace } = useWorkspaceFileUpload({
    folders,
    selectedFolderId,
    createFolder,
    uploadFiles,
  });

  // --- Handlers ---

  const handleCreateFolder = async () => {
    if (!user?.id || !folderFormName.trim()) return;
    setIsSubmitting(true);
    try {
      await createFolder({
        name: folderFormName,
        parentId: createParentId,
      });
      setIsCreateFolderOpen(false);
      setFolderFormName('');
      toast.success("Folder created successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFolder = async () => {
    if (!user?.id || !folderToEdit || !folderFormName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateFolder(folderToEdit.id, {
        name: folderFormName
      });
      setIsEditFolderOpen(false);
      setFolderFormName('');
      setFolderToEdit(null);
      toast.success("Folder updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update folder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to delete this folder? All files inside will be deleted.")) return;
    
    try {
      await deleteFolder(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success("Folder deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    }
  };

  // --- File Handlers (Mock implementation) ---

  const handleSelectFile = (file: FileItem) => {
      if (file.folderId) {
          setSelectedFolderId(file.folderId);
      }
      router.push(`/app/workspace/${file.id}`);
  };

  const handleDeleteFile = async (fileId: string) => {
      if (!confirm("Are you sure you want to delete this file?")) return;
      
      try {
        await deleteFile(fileId);
        toast.success("File deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete file');
      }
  };

  const handleUpdateFile = async () => {
      if (!fileToEdit) return;

      try {
        setIsSubmitting(true);
        await updateFileMetadata(fileToEdit.id, { isShareable });
        setIsEditFileOpen(false);
        setFileToEdit(null);
        toast.success("File updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update file');
      } finally {
        setIsSubmitting(false);
      }
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

    const openEditFileModal = (file: FileItem) => {
      setFileToEdit(file);
      setIsShareable(file.isShareable);
      setIsEditFileOpen(true);
    };

  // --- Drag and Drop ---
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      // Only clear when leaving the sidebar entirely
      if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
      }
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (isUploading) return;
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;
      
      // Folder-specific drop is handled by FolderTreeItem; this is the sidebar fallback
      await handleUploadFiles(droppedFiles);
  };

  /** Called by FolderTreeItem when files are dropped onto a specific folder */
  const handleFolderDrop = async (folderId: string, droppedFiles: File[]) => {
      if (isUploading || droppedFiles.length === 0) return;
      setIsDragging(false);

      setUploadStatus({
      phase: 'preparing',
      totalFiles: droppedFiles.length,
      completedFiles: 0,
      currentFileName: droppedFiles[0]?.name,
      currentFileProgress: 0,
      overallProgress: 0,
      });
      toast.info(`Uploading ${droppedFiles.length} file(s) to folder...`);

      try {
          if (!user?.id) return;
        await uploadIntoWorkspace(droppedFiles, folderId, { onStatusChange: setUploadStatus });
          toast.success('Files uploaded');
      } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploadStatus(null);
      }
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
      if (isUploading) return;

      setUploadStatus({
        phase: 'preparing',
        totalFiles: filesToUpload.length,
        completedFiles: 0,
        currentFileName: filesToUpload[0]?.name,
        currentFileProgress: 0,
        overallProgress: 0,
      });
      toast.info(`Uploading ${filesToUpload.length} file(s)...`);
      
      try {
          if (!user?.id) return;

        await uploadIntoWorkspace(filesToUpload, undefined, { onStatusChange: setUploadStatus });
          toast.success("Files uploaded");
      } catch(err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
          setUploadStatus(null);
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
        {isDragging && !isUploading && (
            <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed m-2 rounded-lg flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                <UploadCloud className="h-12 w-12 text-primary mb-2" />
                <p className="font-semibold text-primary">Drop files to upload</p>
            </div>
        )}
        {isUploading && (
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
                        onClick={() => !isUploading && fileInputRef.current?.click()}
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
                    onClick={() => !isUploading && fileInputRef.current?.click()}
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
            {filesError && (
              <p className="px-2 py-1 text-xs text-destructive">{filesError}</p>
            )}
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
                    onEditFile={openEditFileModal}
                    isCompact={isCompact}
                    onFolderDrop={handleFolderDrop}
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
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={isSubmitting || !folderFormName.trim()}>
                    {isSubmitting ? (
                        <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />Creating...</>
                    ) : 'Create'}
                </Button>
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
                <Button variant="outline" onClick={() => setIsEditFolderOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleEditFolder} disabled={isSubmitting || !folderFormName.trim()}>
                    {isSubmitting ? (
                        <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />Saving...</>
                    ) : 'Save Changes'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

          <Dialog open={isEditFileOpen} onOpenChange={setIsEditFileOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update File</DialogTitle>
              <DialogDescription>
                Update file metadata using the API gateway contract.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label>File Name</Label>
                <p className="text-sm text-muted-foreground break-all">{fileToEdit?.originalName}</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                <div className="space-y-1 pr-4">
                  <Label htmlFor="file-shareable">Shareable</Label>
                  <p className="text-xs text-muted-foreground">Allow this file to be shared with other users.</p>
                </div>
                <Switch id="file-shareable" checked={isShareable} onCheckedChange={setIsShareable} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditFileOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleUpdateFile} disabled={isSubmitting || !fileToEdit}>
                  {isSubmitting ? (
                      <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />Saving...</>
                  ) : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
    </aside>
  );
}

