const EXTENSION_CONTENT_TYPE_MAP: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  js: 'application/javascript',
  ts: 'application/typescript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const MAX_UPLOAD_FILE_SIZE_BYTES = 200 * 1024 * 1024;
const BASE64_CHUNK_SIZE_BYTES = 3 * 16_384;
const BINARY_STRING_CHUNK_SIZE = 0x8000;

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

export function getFileContentType(file: Pick<File, 'name' | 'type'>): string {
  const normalizedType = file.type.trim().toLowerCase();
  if (
    normalizedType &&
    normalizedType !== 'application/octet-stream' &&
    normalizedType !== 'binary/octet-stream'
  ) {
    return normalizedType;
  }

  const inferredType = EXTENSION_CONTENT_TYPE_MAP[getFileExtension(file.name)];
  return inferredType ?? 'application/octet-stream';
}

export function assertUploadFileSize(file: Pick<File, 'size' | 'name'>) {
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new Error(`"${file.name}" exceeds the 200 MB upload limit`);
  }
}

async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(blob);
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < bytes.length; index += BINARY_STRING_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + BINARY_STRING_CHUNK_SIZE));
  }

  return btoa(binary);
}

export async function fileToBase64(file: File): Promise<string> {
  assertUploadFileSize(file);

  const chunks: string[] = [];

  for (let offset = 0; offset < file.size; offset += BASE64_CHUNK_SIZE_BYTES) {
    const slice = file.slice(offset, offset + BASE64_CHUNK_SIZE_BYTES);
    const buffer = await readBlobAsArrayBuffer(slice);
    chunks.push(bytesToBase64(new Uint8Array(buffer)));
  }

  return chunks.join('');
}
