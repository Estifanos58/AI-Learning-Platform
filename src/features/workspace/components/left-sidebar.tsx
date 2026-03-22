'use client';

import { EmptyState } from '@/src/components/common/states';
import { FolderTree } from './folder-tree';
import { useLeftSidebar } from '@/src/hooks/use-left-sidebar';
import { UploadOverlay } from './left-sidebar/upload-overlay';
import { SidebarToolbar } from './left-sidebar/sidebar-toolbar';
import { FolderFileDialogs } from './left-sidebar/folder-file-dialogs';

interface LeftSidebarProps {
  isOpen: boolean;
}

export function LeftSidebar({ isOpen }: LeftSidebarProps) {
  const {
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
    setSelectedFolderId,
  } = useLeftSidebar();

  void isOpen;

  return (
    <aside
      className="bg-card/50 backdrop-blur-xl border-r border-border flex flex-col overflow-hidden w-full h-full"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {isUploading && uploadStatus && <UploadOverlay uploadStatus={uploadStatus} />}

        <SidebarToolbar
          isCompact={isCompact}
          isUploading={isUploading}
          fileInputRef={fileInputRef}
          onFileInputChange={handleFileSelect}
          onPickFiles={() => !isUploading && fileInputRef.current?.click()}
          onOpenCreateFolder={() => openCreateModal()}
          onNewAiChat={openNewAiChat}
        />

        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isCompact ? 'p-1' : 'p-2'}`}>
          {filesError && <p className="px-2 py-1 text-xs text-destructive">{filesError}</p>}
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
                title={isCompact ? '' : 'No Folders'}
                description={isCompact ? 'Empty' : 'Create a folder to start organizing'}
                action={{
                  label: 'New Folder',
                  onClick: () => openCreateModal(),
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

      <FolderFileDialogs
        isCreateFolderOpen={isCreateFolderOpen}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        isEditFolderOpen={isEditFolderOpen}
        setIsEditFolderOpen={setIsEditFolderOpen}
        isEditFileOpen={isEditFileOpen}
        setIsEditFileOpen={setIsEditFileOpen}
        createParentId={createParentId}
        folderFormName={folderFormName}
        setFolderFormName={setFolderFormName}
        isSubmitting={isSubmitting}
        fileToEdit={fileToEdit}
        isShareable={isShareable}
        setIsShareable={setIsShareable}
        onCreateFolder={handleCreateFolder}
        onEditFolder={handleEditFolder}
        onUpdateFile={handleUpdateFile}
      />
    </aside>
  );
}
