import { redirect } from 'next/navigation';
import { getServerAccessToken, gatewayServerGet } from '@/src/lib/api/server';
import { FileItem } from '@/src/lib/types';
import { FilePageClient } from './file-page-client';

export const runtime = 'nodejs';

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

  return <FilePageClient file={file} />;
}
