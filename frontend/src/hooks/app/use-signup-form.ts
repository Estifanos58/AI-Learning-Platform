import { useState } from 'react';

interface UseSignupFormOptions {
  signup: (email: string, username: string, password: string, role?: string) => Promise<void>;
  clearError: () => void;
  onSuccess?: () => void;
}

export function useSignupForm({ signup, clearError, onSuccess }: UseSignupFormOptions) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const role = 'STUDENT';
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    setLocalError(null);
    clearError();

    if (!email || !username || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (!validatePassword(password)) {
      return;
    }

    if (username.length > 100) {
      setLocalError('Username must be 100 characters or less');
      return;
    }

    try {
      await signup(email, username, password, role);
      onSuccess?.();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Signup failed');
    }
  };

  return {
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    role,
    localError,
    passwordError,
    validatePassword,
    handleSubmit,
  };
}
