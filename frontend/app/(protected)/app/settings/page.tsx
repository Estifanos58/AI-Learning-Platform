import { redirect } from 'next/navigation';
import { getServerProfile, isProfileComplete } from '@/src/lib/api/server';
import { SettingsPageClient } from './settings-page-client';

export default async function SettingsPage() {
  const profile = await getServerProfile();

  if (profile && !isProfileComplete(profile)) {
    redirect('/app/profile-setup');
  }

  return <SettingsPageClient />;
}
