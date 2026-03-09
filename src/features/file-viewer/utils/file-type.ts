/**
 * File Type Utilities
 * Provides detection and metadata for different file categories.
 * Extend this file to add support for new file types in the future.
 */

export type FileCategory =
  | 'pdf'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'video'
  | 'audio'
  | 'archive'
  | 'generic';

export interface FileCategoryMeta {
  category: FileCategory;
  /** Human-readable label */
  label: string;
  /** Tailwind color class for icon/badge */
  colorClass: string;
  /** Whether the browser can natively embed this type */
  canEmbed: boolean;
}

/** Map of MIME-type substrings to category metadata */
const MIME_CATEGORY_MAP: Array<{ test: (mime: string) => boolean; meta: FileCategoryMeta }> = [
  {
    test: (m) => m === 'application/pdf',
    meta: { category: 'pdf', label: 'PDF', colorClass: 'text-red-500', canEmbed: true },
  },
  {
    test: (m) => m.startsWith('image/'),
    meta: { category: 'image', label: 'Image', colorClass: 'text-purple-500', canEmbed: true },
  },
  {
    test: (m) =>
      m === 'application/msword' ||
      m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    meta: { category: 'document', label: 'Document', colorClass: 'text-blue-500', canEmbed: false },
  },
  {
    test: (m) =>
      m === 'application/vnd.ms-excel' ||
      m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    meta: { category: 'spreadsheet', label: 'Spreadsheet', colorClass: 'text-green-500', canEmbed: false },
  },
  {
    test: (m) =>
      m === 'application/vnd.ms-powerpoint' ||
      m === 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    meta: { category: 'presentation', label: 'Presentation', colorClass: 'text-orange-500', canEmbed: false },
  },
  {
    test: (m) =>
      m.startsWith('text/') ||
      m === 'application/json' ||
      m === 'application/javascript' ||
      m === 'application/typescript' ||
      m === 'application/xml',
    meta: { category: 'code', label: 'Text / Code', colorClass: 'text-yellow-500', canEmbed: true },
  },
  {
    test: (m) => m.startsWith('video/'),
    meta: { category: 'video', label: 'Video', colorClass: 'text-pink-500', canEmbed: true },
  },
  {
    test: (m) => m.startsWith('audio/'),
    meta: { category: 'audio', label: 'Audio', colorClass: 'text-indigo-500', canEmbed: true },
  },
  {
    test: (m) =>
      m === 'application/zip' ||
      m === 'application/x-tar' ||
      m === 'application/x-rar-compressed' ||
      m === 'application/x-7z-compressed',
    meta: { category: 'archive', label: 'Archive', colorClass: 'text-amber-600', canEmbed: false },
  },
];

/**
 * Returns the category metadata for a given MIME type.
 * Falls back to 'generic' when no match is found.
 */
export function getFileCategoryMeta(contentType: string): FileCategoryMeta {
  const normalized = (contentType ?? '').toLowerCase().split(';')[0].trim();
  const match = MIME_CATEGORY_MAP.find(({ test }) => test(normalized));
  return (
    match?.meta ?? {
      category: 'generic',
      label: 'File',
      colorClass: 'text-muted-foreground',
      canEmbed: false,
    }
  );
}

/** Convenience wrapper – returns just the FileCategory */
export function getFileCategory(contentType: string): FileCategory {
  return getFileCategoryMeta(contentType).category;
}

/**
 * Builds a browser-renderable object URL from a base64 data string.
 * Returns null when data is absent.
 *
 * @param base64 - Raw base64 string (without the data: prefix)
 * @param contentType - MIME type of the data
 */
export function base64ToObjectUrl(base64: string | undefined, contentType: string): string | null {
  if (!base64) return null;
  try {
    const byteChars = atob(base64);
    const byteNums = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteNums], { type: contentType });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
