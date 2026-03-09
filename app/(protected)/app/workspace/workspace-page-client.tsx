'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { useGatewayFiles } from '@/src/hooks/use-gateway';
import { ArrowRight, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useWorkspaceFileUpload } from '@/src/features/workspace/use-workspace-file-upload';

function EmptyStateWithUpload() {
  const { toggleSidebar, sidebarOpen, selectedFolderId } = useWorkspace();
  const { user, session } = useAuth();
  const { folders, createFolder, uploadFiles } = useGatewayFiles(session?.accessToken);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadIntoWorkspace } = useWorkspaceFileUpload({
    folders,
    selectedFolderId,
    createFolder,
    uploadFiles,
  });

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!user?.id) return;

    setIsUploading(true);
    try {
      await uploadIntoWorkspace([file]);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center p-8 transition-colors duration-200 ${
        isDragging ? 'bg-primary/10 border-2 border-dashed border-primary' : 'bg-muted/10'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center ring-8 transition-all duration-300 ${
            isDragging ? 'bg-primary/20 ring-primary/20 scale-110' : 'bg-primary/5 ring-primary/5'
          }`}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          ) : (
            <UploadCloud className={`w-12 h-12 ${isDragging ? 'text-primary' : 'text-primary/60'}`} />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {isDragging ? 'Drop file to upload' : 'No document selected'}
          </h2>
          <p className="text-muted-foreground">
            {isDragging
              ? 'Release to upload your document'
              : 'Select a file from the sidebar, or drag and drop a file to upload.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          {!sidebarOpen && (
            <Button variant="outline" onClick={toggleSidebar} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              Open Sidebar
            </Button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".txt,.md,.json,.pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg"
          />

          <Button
            variant="default"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadCloud className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-8">Supported formats: TXT, PDF, PPTX, Images, DOCX</p>
      </div>
    </div>
  );
}

export function WorkspacePageClient() {
  return <EmptyStateWithUpload />;
}