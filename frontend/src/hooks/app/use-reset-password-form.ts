import { useState } from 'react';

interface UseResetPasswordFormOptions {
  resetPassword: (payload: { token: string; newPassword: string }) => Promise<unknown>;
  onSuccess?: () => void;
}

export function useResetPasswordForm({ resetPassword, onSuccess }: UseResetPasswordFormOptions) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (candidate: string): boolean => {
    if (candidate.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }

    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validatePassword(newPassword)) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setSuccess(true);
      onSuccess?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    token,
    setToken,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    error,
    passwordError,
    success,
    validatePassword,
    handleSubmit,
  };
}
