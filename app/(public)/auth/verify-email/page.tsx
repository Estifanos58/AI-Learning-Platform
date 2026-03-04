'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGatewayAuth } from '@/src/hooks/use-gateway';
import { DynamicBackground } from '@/components/dynamic-background';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { verifyEmail } = useGatewayAuth();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Please enter your verification token');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail({ token });
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
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
            <h1 className="text-3xl font-bold mb-2">Email Verified!</h1>
            <p className="text-muted-foreground mb-6">
              Your email has been verified successfully. Redirecting to login...
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
                <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Verify Email</h1>
            <p className="text-muted-foreground">
              Enter the verification token sent to your email
            </p>
          </div>

          {!success && error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg mb-6 flex items-center gap-2">
                <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Verification Token
              </label>
              <Input
                id="token"
                type="text"
                placeholder="Enter token code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                required
                className="bg-background/50 h-11 border-white/10 focus:border-primary/50 transition-all text-center tracking-widest text-lg font-mono uppercase"
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
                      Verifying...
                  </span>
              ) : "Verify Email"}
            </Button>
          </form> 
          
        </div>
      </div>
    </main>
  );
}
