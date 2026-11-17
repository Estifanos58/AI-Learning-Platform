import { redirect } from 'next/navigation';
import { getServerAccessToken, getServerProfile, isProfileComplete } from '@/src/lib/api/server';
import { ProfileSetupPageClient } from './profile-setup-page-client';

export default async function ProfileSetupPage() {
  const accessToken = await getServerAccessToken();

  if (!accessToken) {
    redirect('/auth/login');
  }

  const profile = await getServerProfile(accessToken);

  if (isProfileComplete(profile)) {
    redirect('/app/workspace');
  }

  return <ProfileSetupPageClient accessToken={accessToken} initialProfile={profile} />;
}