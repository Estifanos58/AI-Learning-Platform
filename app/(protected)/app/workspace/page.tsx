'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { AppShell } from '@/src/features/workspace/components/app-shell';
import { FileItem } from '@/src/lib/types';
import { useGatewayFiles } from '@/src/hooks/use-gateway';
import { PdfViewerShell } from '@/src/features/pdf-viewer/pdf-viewer-shell';
import { EmptyState } from '@/src/components/common/states';

import { FileText, ArrowRight, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper component for Empty State with Upload and Dropzone
function EmptyStateWithUpload() {
  const { toggleSidebar, sidebarOpen, selectedFolderId, setSelectedFileId } = useWorkspace();
  const { user, session } = useAuth();
  const { folders, createFolder, uploadFiles } = useGatewayFiles(session?.accessToken);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Determine folder to upload to
      let targetFolderId = selectedFolderId;
      
      if (!targetFolderId) {
        if (folders.length > 0) {
            targetFolderId = folders[0].id;
        } else {
            // Create a default folder if none exists
            const newFolder = await createFolder({ name: 'Uploads' });
            targetFolderId = newFolder.id;
        }
      }

      if (!targetFolderId) {
        throw new Error("Could not determine target folder");
      }

      await uploadFiles([file], targetFolderId);

      // Optionally select the file to view it immediately
      // The sidebar data refresh will include the uploaded file.
      setSelectedFileId(null);
      
      // We can't easily trigger a refresh of the sidebar list from here without context changes,
      // but selecting the file might trigger a fetch in some components
      
    } catch (err) {
      console.error("Upload failed", err);
      // In a real app, use toast here
    } finally {
      setIsUploading(false);
      // Reset input
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
        <div className={`rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center ring-8 transition-all duration-300 ${
            isDragging ? 'bg-primary/20 ring-primary/20 scale-110' : 'bg-primary/5 ring-primary/5'
        }`}>
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
                    : 'Select a PDF from the sidebar, or drag and drop a file to upload.'}
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
                accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg" // Accepted types
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
        
        <p className="text-xs text-muted-foreground pt-8">
            Supported formats: PDF, PPTX, Images, DOCX
        </p>
      </div>
    </div>
  );
}

function WorkspaceContent() {
  const { user, session } = useAuth();
  const { selectedFileId } = useWorkspace();
  const { getFile } = useGatewayFiles(session?.accessToken);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadFile = async () => {
      if (!user?.id || !selectedFileId) {
        setSelectedFile(null);
        return;
      }

      setIsLoading(true);
      try {
        const file = await getFile(selectedFileId);
        setSelectedFile(file);
      } catch (err) {
        console.error('Failed to load file:', err);
        setSelectedFile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [user?.id, selectedFileId, getFile]);

  return (
    <AppShell>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading file...</p>
          </div>
        </div>
      ) : selectedFile ? (
        <PdfViewerShell file={selectedFile} />
      ) : (
        <EmptyStateWithUpload />
      )}
    </AppShell>
  );
}

export default function WorkspacePage() {
  return <WorkspaceContent />;
}
