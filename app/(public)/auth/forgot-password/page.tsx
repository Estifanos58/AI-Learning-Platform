'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authMockService } from '@/src/lib/mocks';

import { DynamicBackground } from '@/components/dynamic-background';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      await authMockService.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
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
            
          <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary animate-float">
                <Mail className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent password reset instructions to <strong className="text-foreground">{email}</strong>
            </p>
            <Button onClick={() => router.push('/auth/login')} className="w-full h-11 text-base shadow-lg shadow-primary/20">
              Back to Login
            </Button>
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
                <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Forgot password?</h1>
            <p className="text-muted-foreground">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {!sent && error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-6 flex items-center gap-2">
                <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="bg-background/50 h-11 border-white/10 focus:border-primary/50 transition-all"
              />
            </div>
            
            <Button 
                type="submit" 
                className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
                disabled={isLoading}
            >
              {isLoading ? (
                  <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
                      Sending...
                  </span>
              ) : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
