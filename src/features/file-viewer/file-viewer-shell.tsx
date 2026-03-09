'use client';

/**
 * FileViewerShell – Dispatches to the correct viewer based on file content-type.
 *
 * This is the single entry-point for viewing any file in the workspace.
 * To add support for a new file type:
 *   1. Create a new viewer component in a sub-directory.
 *   2. Add its MIME type(s) to `src/features/file-viewer/utils/file-type.ts`.
 *   3. Add a new case in the switch statement below.
 */

import { FileItem } from '@/src/lib/types';
import { getFileCategory } from './utils/file-type';
import { PdfViewer } from './pdf/pdf-viewer';
import { ImageViewer } from './image/image-viewer';
import { DocumentViewer } from './document/document-viewer';
import { GenericViewer } from './generic/generic-viewer';

interface FileViewerShellProps {
  file: FileItem;
  /**
   * Optional pre-built object / data URL for the file content.
   * When provided, viewers that can embed content (PDF, image) will use it.
   */
  src?: string;
  /**
   * Publicly accessible URL used by the Document viewer for Office Online embed.
   * Leave undefined if the file is private.
   */
  publicUrl?: string;
}

export function FileViewerShell({ file, src, publicUrl }: FileViewerShellProps) {
  const category = getFileCategory(file.contentType);

  switch (category) {
    case 'pdf':
      return <PdfViewer file={file} src={src} />;

    case 'image':
      return <ImageViewer file={file} src={src} />;

    case 'document':
    case 'spreadsheet':
    case 'presentation':
      return <DocumentViewer file={file} publicUrl={publicUrl} />;

    case 'video':
      return (
        <div className="h-full flex flex-col bg-card">
          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            {src ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={src}
                controls
                aria-label={file.originalName}
                className="max-w-full max-h-full rounded shadow-2xl"
              />
            ) : (
              <GenericViewer file={file} />
            )}
          </div>
        </div>
      );

    case 'audio':
      return (
        <div className="h-full flex flex-col bg-card">
          <div className="flex-1 overflow-auto flex items-center justify-center p-8">
            {src ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <audio src={src} controls aria-label={file.originalName} className="w-full max-w-lg" />
            ) : (
              <GenericViewer file={file} />
            )}
          </div>
        </div>
      );

    case 'code':
      // Falls through to generic for now; replace with a code/text viewer later.
      return <GenericViewer file={file} />;

    default:
      return <GenericViewer file={file} />;
  }
}
