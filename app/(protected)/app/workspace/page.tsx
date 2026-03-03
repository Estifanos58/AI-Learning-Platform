'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { AppShell } from '@/src/features/workspace/components/app-shell';
import { FileItem } from '@/src/lib/types';
import { fileMockService } from '@/src/lib/mocks';
import { PdfViewerShell } from '@/src/features/pdf-viewer/pdf-viewer-shell';
import { EmptyState } from '@/src/components/common/states';

import { FileText, ArrowRight, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper component for Empty State
function NoFileSelectedState() {
  const { toggleSidebar, sidebarOpen } = useWorkspace(); // Assuming we export these from hook, if not need modify hook

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="bg-primary/5 rounded-full p-8 mx-auto w-32 h-32 flex items-center justify-center ring-8 ring-primary/5">
            <FileText className="w-12 h-12 text-primary/60" />
        </div>
        
        <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">No document selected</h2>
            <p className="text-muted-foreground">
                Select a PDF from the sidebar to start reading, or upload a new document to your workspace.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
             {!sidebarOpen && (
                <Button variant="outline" onClick={toggleSidebar} className="gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Open Sidebar
                </Button>
             )}
             
             {/* Note: This button is purely visual as upload logic is in sidebar for now */}
             <Button variant="default" className="gap-2 cursor-not-allowed opacity-80" title="Use the sidebar to upload files">
                <UploadCloud className="w-4 h-4" />
                Upload Document
             </Button>
        </div>
        
        <p className="text-xs text-muted-foreground pt-8">
            Supported formats: PDF
        </p>
      </div>
    </div>
  );
}

function WorkspaceContent() {
  const { user } = useAuth();
  const { selectedFileId } = useWorkspace();
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
        const file = await fileMockService.getFileMetadata(user.id, selectedFileId);
        setSelectedFile(file);
      } catch (err) {
        console.error('Failed to load file:', err);
        setSelectedFile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [user?.id, selectedFileId]);

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
        <NoFileSelectedState />
      )}
    </AppShell>
  );
}

export default function WorkspacePage() {
  return <WorkspaceContent />;
}
