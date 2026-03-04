'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authMockService } from '@/src/lib/mocks';

import { DynamicBackground } from '@/components/dynamic-background';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string): boolean => {
    if (pwd.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await authMockService.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <DynamicBackground />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in-up">
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500 animate-float">
                <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Password Reset!</h1>
            <p className="text-muted-foreground mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <DynamicBackground />
      
      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <Button 
            variant="ghost" 
            className="absolute -top-16 left-0" 
            onClick={() => router.push('/auth/login')}
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
        </Button>

        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 text-primary animate-float">
                <LockKeyhole className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your reset token and new password
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium mb-2">
                Reset Token
              </label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                disabled={isLoading}
                className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
              />
              {passwordError && (
                <p className="text-xs text-destructive mt-1">{passwordError}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <Input
                id="confirm"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="bg-background/50 border-white/10 focus:border-primary/50 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
