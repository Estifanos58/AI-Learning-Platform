'use client';

import { useAuth } from '@/src/contexts/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkspaceProvider } from '@/src/features/workspace/workspace-context';
import { ProfileModal } from '@/src/features/workspace/components/profile-modal';
import { useGatewayProfile } from '@/src/hooks/use-gateway';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isProfileLoading, error: profileError } = useGatewayProfile(session?.accessToken);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  useEffect(() => {
    if (!isAuthLoading && !session) {
      router.push('/auth/login');
    }
  }, [session, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !session || isProfileLoading) {
      return;
    }

    const isProfileSetupRoute = pathname === '/app/profile-setup';

    if (profileError) {
      setIsCheckingProfile(false);
      return;
    }

    if (!profile) {
      setIsCheckingProfile(false);
      return;
    }

    const isComplete = Boolean(profile.firstName?.trim() && profile.lastName?.trim());
    if (!isComplete && !isProfileSetupRoute) {
      router.push('/app/profile-setup');
      return;
    }

    setIsCheckingProfile(false);
  }, [session, isAuthLoading, profile, isProfileLoading, profileError, pathname, router]);

  if (isAuthLoading || isProfileLoading || isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <WorkspaceProvider>
      {children}
      <ProfileModal />
    </WorkspaceProvider>
  );
}
