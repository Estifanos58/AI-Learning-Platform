import { useState } from 'react';
import { gatewayApi } from '@/src/lib/api/gateway';
import { UserProfile } from '@/src/lib/types';

interface UseProfileSetupFormOptions {
  accessToken: string;
  initialProfile: UserProfile | null;
  onSuccess?: () => void;
}

export function useProfileSetupForm({ accessToken, initialProfile, onSuccess }: UseProfileSetupFormOptions) {
  const [firstName, setFirstName] = useState(initialProfile?.firstName || '');
  const [lastName, setLastName] = useState(initialProfile?.lastName || '');
  const [universityId, setUniversityId] = useState(initialProfile?.universityId || '');
  const [department, setDepartment] = useState(initialProfile?.department || '');
  const [bio, setBio] = useState(initialProfile?.bio || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and Last name are required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await gatewayApi.profile.updateMe(accessToken, {
        firstName,
        lastName,
        universityId,
        department,
        bio,
      });
      onSuccess?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    firstName,
    setFirstName,
    lastName,
    setLastName,
    universityId,
    setUniversityId,
    department,
    setDepartment,
    bio,
    setBio,
    error,
    isSaving,
    handleSubmit,
  };
}
