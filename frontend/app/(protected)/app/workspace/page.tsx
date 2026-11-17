import { redirect } from 'next/navigation';
import { getServerProfile, isProfileComplete } from '@/src/lib/api/server';
import { WorkspacePageClient } from './workspace-page-client';

export default async function WorkspacePage() {
  const profile = await getServerProfile();

  if (profile && !isProfileComplete(profile)) {
    redirect('/app/profile-setup');
  }

  return <WorkspacePageClient />;
}
