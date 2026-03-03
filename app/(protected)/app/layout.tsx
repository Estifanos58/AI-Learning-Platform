'use client';

import { useAuth } from '@/src/contexts/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WorkspaceProvider } from '@/src/features/workspace/workspace-context';
import { ProfileModal } from '@/src/features/workspace/components/profile-modal';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <WorkspaceProvider>
      {children}
      <ProfileModal />
    </WorkspaceProvider>
  );
}
