import { readFile } from 'node:fs/promises';
import { redirect } from 'next/navigation';
import { getServerAccessToken, gatewayServerGet } from '@/src/lib/api/server';
import { FileItem } from '@/src/lib/types';
import { getFileCategory } from '@/src/features/file-viewer';
import { FilePageClient } from './file-page-client';

export const runtime = 'nodejs';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8080/api/internal';
const GATEWAY_ORIGIN = new URL(API_BASE_URL).origin;

function sanitizeResolvedPath(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function getGatewayFilePath(fileId: string, token: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/path`, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return sanitizeResolvedPath(await response.text());
}

async function tryFetchBuffer(url: string): Promise<Buffer | null> {
  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function loadBufferFromPath(candidate: string): Promise<Buffer | null> {
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate)) {
    return tryFetchBuffer(candidate);
  }

  const remoteCandidate = candidate.startsWith('/')
    ? new URL(candidate, GATEWAY_ORIGIN).toString()
    : new URL(`/${candidate.replace(/^\/+/, '')}`, GATEWAY_ORIGIN).toString();

  const fetchedBuffer = await tryFetchBuffer(remoteCandidate);
  if (fetchedBuffer) {
    return fetchedBuffer;
  }

  try {
    return await readFile(candidate);
  } catch {
    return null;
  }
}

async function fetchFileContent(
  fileId: string,
  file: FileItem,
  token: string,
): Promise<{ textContent?: string; base64Content?: string }> {
  const category = getFileCategory(file.contentType);

  if (category !== 'pdf' && category !== 'image' && category !== 'code') {
    return {};
  }

  const candidates = [await getGatewayFilePath(fileId, token), file.storagePath].filter(
    (v): v is string => Boolean(v),
  );

  for (const candidate of candidates) {
    const buffer = await loadBufferFromPath(candidate);
    if (!buffer) {
      continue;
    }

    if (category === 'code') {
      return { textContent: buffer.toString('utf-8') };
    }

    return { base64Content: buffer.toString('base64') };
  }

  return {};
}

export default async function FileViewPage({ params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const token = await getServerAccessToken();

  if (!token) {
    redirect('/auth/login');
  }

  const file = await gatewayServerGet<FileItem>(`/files/${fileId}`, {
    token,
    revalidateSeconds: 0,
    tags: ['files', `file-${fileId}`],
  });

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        File not found
      </div>
    );
  }

  const content = await fetchFileContent(fileId, file, token);

  return <FilePageClient file={file} {...content} />;
}
