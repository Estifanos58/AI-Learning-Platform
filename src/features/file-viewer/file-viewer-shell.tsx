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
import { getFileCategory, getFileSubtype } from './utils/file-type';
import { PdfViewer } from './pdf/pdf-viewer';
import { ImageViewer } from './image/image-viewer';
import { DocumentViewer } from './document/document-viewer';
import { GenericViewer } from './generic/generic-viewer';
import { TextViewer } from './text/text-viewer';
import { VideoViewer } from './video/video-viewer';
import { AudioViewer } from './audio/audio-viewer';
import { MarkdownViewer } from './text/markdown-viewer';
import { CsvViewer } from './text/csv-viewer';
import { JsonViewer } from './text/json-viewer';
import { XmlViewer } from './text/xml-viewer';

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
  /** Optional plain-text content for text/code previews. */
  textContent?: string;
  /** Called when the user clicks the Download button in the toolbar. */
  onDownload?: () => void;
}

export function FileViewerShell({ file, src, publicUrl, textContent, onDownload }: FileViewerShellProps) {
  const category = getFileCategory(file.contentType);
  const subtype = getFileSubtype(file.contentType);

  if (subtype === 'md' && textContent) {
    return <MarkdownViewer file={file} textContent={textContent} onDownload={onDownload} />;
  }

  if (subtype === 'csv' && textContent) {
    return <CsvViewer file={file} textContent={textContent} onDownload={onDownload} />;
  }

  if (subtype === 'json' && textContent) {
    return <JsonViewer file={file} textContent={textContent} onDownload={onDownload} />;
  }

  if (subtype === 'xml' && textContent) {
    return <XmlViewer file={file} textContent={textContent} onDownload={onDownload} />;
  }

  switch (category) {
    case 'pdf':
      return <PdfViewer file={file} src={src} onDownload={onDownload} />;

    case 'image':
      return <ImageViewer file={file} src={src} onDownload={onDownload} />;

    case 'document':
    case 'spreadsheet':
    case 'presentation':
      return <DocumentViewer file={file} publicUrl={publicUrl} onDownload={onDownload} />;

    case 'video':
      return <VideoViewer file={file} src={src} onDownload={onDownload} />;

    case 'audio':
      return <AudioViewer file={file} src={src} onDownload={onDownload} />;

    case 'code':
      return textContent ? (
        <TextViewer file={file} textContent={textContent} onDownload={onDownload} />
      ) : (
        <GenericViewer file={file} onDownload={onDownload} />
      );

    default:
      return <GenericViewer file={file} onDownload={onDownload} />;
  }
}
