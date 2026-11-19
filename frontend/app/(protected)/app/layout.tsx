import { redirect } from 'next/navigation';
import { WorkspaceProvider } from '@/src/features/workspace/workspace-context';
import { ProfileModal } from '@/src/features/workspace/components/profile-modal';
import { hasServerAuthCookies } from '@/src/lib/api/server';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasSessionCookie = await hasServerAuthCookies();

  if (!hasSessionCookie) {
    redirect('/auth/login');
  }

  return (
    <WorkspaceProvider>
      {children}
      <ProfileModal />
    </WorkspaceProvider>
  );
}
