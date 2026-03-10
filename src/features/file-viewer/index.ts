/**
 * File Viewer feature – Public exports
 *
 * Import from this file to use any part of the file viewer system.
 */

// Main shell – the primary component to use in the workspace
export { FileViewerShell } from './file-viewer-shell';

// Individual viewers – import directly to embed in custom layouts
export { PdfViewer } from './pdf/pdf-viewer';
export { ImageViewer } from './image/image-viewer';
export { DocumentViewer } from './document/document-viewer';
export { TextViewer } from './text/text-viewer';
export { MarkdownViewer } from './text/markdown-viewer';
export { CsvViewer } from './text/csv-viewer';
export { JsonViewer } from './text/json-viewer';
export { XmlViewer } from './text/xml-viewer';
export { VideoViewer } from './video/video-viewer';
export { AudioViewer } from './audio/audio-viewer';
export { GenericViewer } from './generic/generic-viewer';

// Shared toolbar – use in custom viewer layouts
export { ViewerToolbar } from './viewer-toolbar';
export type { ViewerToolbarProps } from './viewer-toolbar';

// Utilities
export { getFileCategory, getFileCategoryMeta, getFileSubtype, base64ToObjectUrl } from './utils/file-type';
export type { FileCategory, FileCategoryMeta, FileSubtype } from './utils/file-type';
