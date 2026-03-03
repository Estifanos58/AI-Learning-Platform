'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/src/contexts/auth';
import { Bot, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password123');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      router.push('/app/workspace');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 border-r border-zinc-800 p-10 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-primary/20 blur-[120px] rounded-full opacity-30" />
          <div className="absolute top-[40%] right-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[100px] rounded-full opacity-30" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-lg font-medium text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          AI Learning Platform
        </div>

        <div className="relative z-10 max-w-lg">
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-relaxed text-zinc-200">
              &ldquo;The future of learning is here. Coordinate with AI agents and your team in real-time to master any subject faster than ever before.&rdquo;
            </p>
            <footer className="text-zinc-400 text-sm mt-4">Verified User</footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} AI Learning Platform Inc.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative">
        <Button 
            variant="ghost" 
            className="absolute top-4 right-4 md:top-8 md:right-8" 
            onClick={() => router.push('/')}
        >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
        </Button>

        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="bg-background"
              />
            </div>

            {displayError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-500 text-center">
                {displayError}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing in...
                </div>
              ) : (
                'Sign In with Email'
              )}
            </Button>
          </form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            <Link 
              href="/auth/signup" 
              className="hover:text-primary underline underline-offset-4 transition-colors"
            >
              Don&apos;t have an account? Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
