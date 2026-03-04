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
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 border-r border-zinc-800 p-10 relative overflow-hidden group">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-lg font-medium text-white animate-fade-in-up">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground animate-float">
            <Bot className="h-5 w-5" />
          </div>
          AI Learning Platform
        </div>

        <div className="relative z-10 max-w-lg animate-fade-in-up animation-delay-2000">
          <blockquote className="space-y-2">
            <div className="absolute -left-4 -top-4 text-6xl text-primary/20 font-serif">"</div>
            <p className="text-2xl font-medium leading-relaxed text-zinc-200 relative">
              The future of learning is here. Coordinate with AI agents and your team in real-time.
            </p>
            <footer className="text-zinc-400 text-sm mt-4 flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary inline-block"></span>
                Verified User
            </footer>
          </blockquote>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} AI Learning Platform Inc.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <Button 
            variant="ghost" 
            className="absolute top-4 right-4 md:top-8 md:right-8 z-20" 
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
