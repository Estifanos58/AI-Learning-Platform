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
export { GenericViewer } from './generic/generic-viewer';

// Shared toolbar – use in custom viewer layouts
export { ViewerToolbar } from './viewer-toolbar';
export type { ViewerToolbarProps } from './viewer-toolbar';

// Utilities
export { getFileCategory, getFileCategoryMeta, base64ToObjectUrl } from './utils/file-type';
export type { FileCategory, FileCategoryMeta } from './utils/file-type';
