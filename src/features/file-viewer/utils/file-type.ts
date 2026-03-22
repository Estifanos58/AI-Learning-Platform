import { EXACT_MIME_SUBTYPE_MAP, SUBTYPE_META_MAP } from './file-type.maps';
import { FileCategory, FileCategoryMeta, FileSubtype } from './file-type.types';

export type { FileCategory, FileCategoryMeta, FileSubtype } from './file-type.types';

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

export function getFileCategoryMeta(contentType: string): FileCategoryMeta {
  const subtype = getFileSubtype(contentType);
  return SUBTYPE_META_MAP[subtype];
}

export function getFileCategory(contentType: string): FileCategory {
  return getFileCategoryMeta(contentType).category;
}

export function base64ToObjectUrl(base64: string | undefined, contentType: string): string | null {
  if (!base64) return null;

  try {
    const byteChars = atob(base64);
    const byteNums = new Uint8Array(byteChars.length);

    for (let index = 0; index < byteChars.length; index++) {
      byteNums[index] = byteChars.charCodeAt(index);
    }

    const blob = new Blob([byteNums], { type: contentType });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
