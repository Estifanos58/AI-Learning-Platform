'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/src/contexts/auth';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [localError, setLocalError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
    setLocalError(null);
    clearError();

    // Validation
    if (!email || !username || !password || !role) {
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
      router.push('/auth/verify-email');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col justify-between bg-zinc-900 border-r border-zinc-800 p-10 relative overflow-hidden group">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[20%] -right-[10%] w-[70%] h-[70%] bg-purple-500/20 blur-[120px] rounded-full opacity-30 animate-pulse" />
          <div className="absolute bottom-[10%] left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[100px] rounded-full opacity-30 animate-pulse animation-delay-2000" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
          
          {/* Animated Blobs */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-primary/30 rounded-full blur-2xl animate-blob" />
          <div className="absolute bottom-40 right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl animate-blob animation-delay-2000" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-lg font-medium text-white animate-fade-in-up">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground animate-float">
            <Sparkles className="h-5 w-5" />
          </div>
          AI Learning Platform
        </div>

        <div className="relative z-10 max-w-lg animate-fade-in-up animation-delay-2000">
          <blockquote className="space-y-2">
            <div className="absolute -left-4 -top-4 text-6xl text-primary/20 font-serif">"</div>
            <p className="text-2xl font-medium leading-relaxed text-zinc-200 relative">
              Join thousands of students and educators transforming their document interaction workflow. A new era of learning awaits.
            </p>
          </blockquote>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} AI Learning Platform Inc.
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative overflow-y-auto min-h-full">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none" />
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
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email below to create your account
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium leading-none">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a username"
                maxLength={100}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                disabled={isLoading}
              />
              {passwordError && (
                <p className="text-xs text-destructive mt-1">{passwordError}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium leading-none">
                I am a...
              </label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {displayError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-500 text-center">
                {displayError}
              </div>
            )}

            <Button className="w-full" type="submit" disabled={isLoading} size="lg">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            <Link 
              href="/auth/login" 
              className="hover:text-primary underline underline-offset-4 transition-colors"
            >
              Already have an account? Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
