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

export type FileSubtype =
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'gif'
  | 'webp'
  | 'svg'
  | 'txt'
  | 'md'
  | 'csv'
  | 'json'
  | 'xml'
  | 'js'
  | 'ts'
  | 'mp4'
  | 'webm'
  | 'mov'
  | 'mp3'
  | 'wav'
  | 'ogg'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'ppt'
  | 'pptx'
  | 'zip'
  | 'tar'
  | 'rar'
  | '7z'
  | 'unknown';

export interface FileCategoryMeta {
  category: FileCategory;
  /** Human-readable label */
  label: string;
  /** Tailwind color class for icon/badge */
  colorClass: string;
  /** Whether the browser can natively embed this type */
  canEmbed: boolean;
}

const EXACT_MIME_SUBTYPE_MAP: Record<string, FileSubtype> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpg': 'jpg',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/xml': 'xml',
  'application/javascript': 'js',
  'application/typescript': 'ts',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/zip': 'zip',
  'application/x-tar': 'tar',
  'application/x-rar-compressed': 'rar',
  'application/x-7z-compressed': '7z',
};

const SUBTYPE_META_MAP: Record<FileSubtype, Omit<FileCategoryMeta, 'label'> & { label: string }> = {
  pdf: { category: 'pdf', label: 'PDF', colorClass: 'text-red-500', canEmbed: true },
  png: { category: 'image', label: 'PNG Image', colorClass: 'text-purple-500', canEmbed: true },
  jpg: { category: 'image', label: 'JPG Image', colorClass: 'text-purple-500', canEmbed: true },
  jpeg: { category: 'image', label: 'JPEG Image', colorClass: 'text-purple-500', canEmbed: true },
  gif: { category: 'image', label: 'GIF Image', colorClass: 'text-purple-500', canEmbed: true },
  webp: { category: 'image', label: 'WEBP Image', colorClass: 'text-purple-500', canEmbed: true },
  svg: { category: 'image', label: 'SVG Image', colorClass: 'text-purple-500', canEmbed: true },
  txt: { category: 'code', label: 'Text', colorClass: 'text-yellow-500', canEmbed: true },
  md: { category: 'code', label: 'Markdown', colorClass: 'text-yellow-500', canEmbed: true },
  csv: { category: 'code', label: 'CSV', colorClass: 'text-yellow-500', canEmbed: true },
  json: { category: 'code', label: 'JSON', colorClass: 'text-yellow-500', canEmbed: true },
  xml: { category: 'code', label: 'XML', colorClass: 'text-yellow-500', canEmbed: true },
  js: { category: 'code', label: 'JavaScript', colorClass: 'text-yellow-500', canEmbed: true },
  ts: { category: 'code', label: 'TypeScript', colorClass: 'text-yellow-500', canEmbed: true },
  mp4: { category: 'video', label: 'MP4 Video', colorClass: 'text-pink-500', canEmbed: true },
  webm: { category: 'video', label: 'WEBM Video', colorClass: 'text-pink-500', canEmbed: true },
  mov: { category: 'video', label: 'MOV Video', colorClass: 'text-pink-500', canEmbed: true },
  mp3: { category: 'audio', label: 'MP3 Audio', colorClass: 'text-indigo-500', canEmbed: true },
  wav: { category: 'audio', label: 'WAV Audio', colorClass: 'text-indigo-500', canEmbed: true },
  ogg: { category: 'audio', label: 'OGG Audio', colorClass: 'text-indigo-500', canEmbed: true },
  doc: { category: 'document', label: 'DOC Document', colorClass: 'text-blue-500', canEmbed: false },
  docx: { category: 'document', label: 'DOCX Document', colorClass: 'text-blue-500', canEmbed: false },
  xls: { category: 'spreadsheet', label: 'XLS Spreadsheet', colorClass: 'text-green-500', canEmbed: false },
  xlsx: { category: 'spreadsheet', label: 'XLSX Spreadsheet', colorClass: 'text-green-500', canEmbed: false },
  ppt: { category: 'presentation', label: 'PPT Presentation', colorClass: 'text-orange-500', canEmbed: false },
  pptx: { category: 'presentation', label: 'PPTX Presentation', colorClass: 'text-orange-500', canEmbed: false },
  zip: { category: 'archive', label: 'ZIP Archive', colorClass: 'text-amber-600', canEmbed: false },
  tar: { category: 'archive', label: 'TAR Archive', colorClass: 'text-amber-600', canEmbed: false },
  rar: { category: 'archive', label: 'RAR Archive', colorClass: 'text-amber-600', canEmbed: false },
  '7z': { category: 'archive', label: '7Z Archive', colorClass: 'text-amber-600', canEmbed: false },
  unknown: { category: 'generic', label: 'File', colorClass: 'text-muted-foreground', canEmbed: false },
};

function normalizeContentType(contentType: string): string {
  return (contentType ?? '').toLowerCase().split(';')[0].trim();
}

export function getFileSubtype(contentType: string): FileSubtype {
  const normalized = normalizeContentType(contentType);

  if (EXACT_MIME_SUBTYPE_MAP[normalized]) {
    return EXACT_MIME_SUBTYPE_MAP[normalized];
  }

  if (normalized.startsWith('image/')) return 'png';
  if (normalized.startsWith('text/')) return 'txt';
  if (normalized.startsWith('video/')) return 'mp4';
  if (normalized.startsWith('audio/')) return 'mp3';

  return 'unknown';
}

/**
 * Returns the category metadata for a given MIME type.
 * Falls back to 'generic' when no match is found.
 */
export function getFileCategoryMeta(contentType: string): FileCategoryMeta {
  const subtype = getFileSubtype(contentType);
  return SUBTYPE_META_MAP[subtype];
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
