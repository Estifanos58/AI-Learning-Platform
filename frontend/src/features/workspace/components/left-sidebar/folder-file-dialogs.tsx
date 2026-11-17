'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileItem } from '@/src/lib/types';

interface FolderFileDialogsProps {
  isCreateFolderOpen: boolean;
  setIsCreateFolderOpen: (open: boolean) => void;
  isEditFolderOpen: boolean;
  setIsEditFolderOpen: (open: boolean) => void;
  isEditFileOpen: boolean;
  setIsEditFileOpen: (open: boolean) => void;
  createParentId?: string;
  folderFormName: string;
  setFolderFormName: (v: string) => void;
  isSubmitting: boolean;
  fileToEdit: FileItem | null;
  isShareable: boolean;
  setIsShareable: (v: boolean) => void;
  onCreateFolder: () => void;
  onEditFolder: () => void;
  onUpdateFile: () => void;
}

export function FolderFileDialogs({
  isCreateFolderOpen,
  setIsCreateFolderOpen,
  isEditFolderOpen,
  setIsEditFolderOpen,
  isEditFileOpen,
  setIsEditFileOpen,
  createParentId,
  folderFormName,
  setFolderFormName,
  isSubmitting,
  fileToEdit,
  isShareable,
  setIsShareable,
  onCreateFolder,
  onEditFolder,
  onUpdateFile,
}: FolderFileDialogsProps) {
  return (
    <>
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createParentId ? 'New Subfolder' : 'New Folder'}</DialogTitle>
            <DialogDescription>
              {createParentId ? 'Create a folder inside the selected folder.' : 'Create a root folder in your workspace.'}
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
                if (e.key === 'Enter') onCreateFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={onCreateFolder} disabled={isSubmitting || !folderFormName.trim()}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                if (e.key === 'Enter') onEditFolder();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFolderOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={onEditFolder} disabled={isSubmitting || !folderFormName.trim()}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditFileOpen} onOpenChange={setIsEditFileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update File</DialogTitle>
            <DialogDescription>Update file metadata using the API gateway contract.</DialogDescription>
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
            <Button variant="outline" onClick={() => setIsEditFileOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={onUpdateFile} disabled={isSubmitting || !fileToEdit}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
