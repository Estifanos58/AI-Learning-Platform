import { redirect } from 'next/navigation';
import { COOKIE_SESSION_SENTINEL } from '@/src/lib/api/core/csrf';
import { getServerAccessToken, getServerProfile, hasServerAuthCookies, isProfileComplete } from '@/src/lib/api/server';
import { ProfileSetupPageClient } from './profile-setup-page-client';

export default async function ProfileSetupPage() {
  const hasCookies = await hasServerAuthCookies();
  if (!hasCookies) {
    redirect('/auth/login');
  }

  const accessToken = await getServerAccessToken();
  const profile = accessToken ? await getServerProfile(accessToken) : null;

  if (isProfileComplete(profile)) {
    redirect('/app/workspace');
  }

  // Never serialize the raw HttpOnly JWT into RSC client props; client calls authenticate via HttpOnly cookies.
  return <ProfileSetupPageClient accessToken={COOKIE_SESSION_SENTINEL} initialProfile={profile} />;
}
