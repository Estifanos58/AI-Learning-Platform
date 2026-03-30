'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Folder, FileItem, FileUploadStatus } from '@/src/lib/types';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { useGatewayFiles } from '@/src/hooks/use-gateway';
import { useWorkspaceFileUpload } from '@/src/features/workspace/use-workspace-file-upload';
import { useWorkspaceLayout, LayoutNode } from '@/src/features/workspace/components/workspace-layout/workspace-layout-context';

export function useLeftSidebar() {
  const { user, session } = useAuth();
  const {
    selectedFolderId,
    setSelectedFolderId,
    leftSidebarWidth,
    setChatroomId,
    setDraftOtherUserId,
    chatPanelOpen,
    toggleChatPanel,
  } = useWorkspace();
  const { openTab, activePaneId, layoutTree, splitPane } = useWorkspaceLayout();
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

  const isCompact = leftSidebarWidth < 240;

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

  const isUploading = uploadStatus !== null;

  const { uploadIntoWorkspace } = useWorkspaceFileUpload({
    folders,
    selectedFolderId,
    createFolder,
    uploadFiles,
  });

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
      toast.success('Folder created successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditFolder = async () => {
    if (!user?.id || !folderToEdit || !folderFormName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateFolder(folderToEdit.id, {
        name: folderFormName,
      });
      setIsEditFolderOpen(false);
      setFolderFormName('');
      setFolderToEdit(null);
      toast.success('Folder updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to delete this folder? All files inside will be deleted.')) return;

    try {
      await deleteFolder(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success('Folder deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete folder');
    }
  };

  const handleSelectFile = (file: FileItem) => {
    if (file.folderId) {
      setSelectedFolderId(file.folderId);
    }
    router.push(`/app/workspace/${file.id}`);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteFile(fileId);
      toast.success('File deleted');
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
      toast.success('File updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update file');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
      toast.success('Files uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadStatus(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (isUploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    await handleUploadFiles(droppedFiles);
  };

  const handleFolderDrop = async (folderId: string, droppedFiles: File[]) => {
    if (isUploading || droppedFiles.length === 0) return;

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

  const openOldAiChat = (chatroomId: string, title?: string) => {
    const chatTab = { id: chatroomId, title: title || "AI Chat", type: "chat" as const };
    openTab(chatTab, activePaneId);
  };

  const openNewAiChat = () => {
    // Check if there's any file currently opened
    let hasOpenFile = false;
    const checkFileOpen = (node: LayoutNode) => {
      if (node.type === 'pane' && node.tabs && node.tabs.length > 0) {
        hasOpenFile = true;
      } else if (node.type === 'split') {
        node.children.forEach(checkFileOpen);
      }
    };
    checkFileOpen(layoutTree);

    const chatId = `chat-${Date.now()}`;
    const chatTab = { id: chatId, title: 'New AI Chat', type: 'chat' as const };

    if (hasOpenFile) {
      splitPane(activePaneId, 'horizontal');
      // The split action synchronously transitions activePaneId to the new pane in state reducer
      openTab(chatTab);
    } else {
      openTab(chatTab, activePaneId);
    }
  };

  return {
    folders,
    files,
    selectedFolderId,
    isLoading,
    filesError,
    isCompact,
    isUploading,
    uploadStatus,
    fileInputRef,
    isCreateFolderOpen,
    setIsCreateFolderOpen,
    isEditFolderOpen,
    setIsEditFolderOpen,
    isEditFileOpen,
    setIsEditFileOpen,
    folderFormName,
    setFolderFormName,
    createParentId,
    fileToEdit,
    isShareable,
    setIsShareable,
    isSubmitting,
    handleCreateFolder,
    handleEditFolder,
    handleDeleteFolder,
    handleSelectFile,
    handleDeleteFile,
    handleUpdateFile,
    openCreateModal,
    openEditModal,
    openEditFileModal,
    handleDragOver,
    handleDrop,
    handleFolderDrop,
    handleFileSelect,
    openNewAiChat,
    openOldAiChat,
    setSelectedFolderId,
  };
}
