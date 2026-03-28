import { useState } from 'react';

interface UseLoginFormOptions {
  login: (email: string, password: string) => Promise<void>;
  clearError: () => void;
  onSuccess?: () => void;
}

export function useLoginForm({ login, clearError, onSuccess }: UseLoginFormOptions) {
  const [email, setEmail] = useState('estifkebe08@gmail.com');
  const [password, setPassword] = useState('1234567890');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      onSuccess?.();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    localError,
    handleSubmit,
  };
}
