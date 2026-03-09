import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getServerAccessToken, gatewayServerGet } from '@/src/lib/api/server';
import { FileItem } from '@/src/lib/types';

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
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  });

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

export async function GET(_: Request, context: { params: Promise<{ fileId: string }> }) {
  const token = await getServerAccessToken();
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { fileId } = await context.params;
  const file = await gatewayServerGet<FileItem>(`/files/${fileId}`, {
    token,
    revalidateSeconds: 0,
    tags: ['files', `file-${fileId}`],
  });

  if (!file) {
    return NextResponse.json({ message: 'File not found' }, { status: 404 });
  }

  const candidates = [await getGatewayFilePath(fileId, token), file.storagePath].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const buffer = await loadBufferFromPath(candidate);
    if (!buffer) {
      continue;
    }

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': buffer.byteLength.toString(),
        'Content-Disposition': `inline; filename="${file.originalName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  }

  return NextResponse.json({ message: 'File content could not be resolved from the backend' }, { status: 404 });
}