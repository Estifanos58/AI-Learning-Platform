'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/src/contexts/auth';
import { useGatewayProfile } from '@/src/hooks/use-gateway';
import { Loader2 } from 'lucide-react';

export default function ProfileSetupPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile, isLoading, updateProfile } = useGatewayProfile(session?.accessToken);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [department, setDepartment] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setUniversityId(profile.universityId || '');
      setDepartment(profile.department || '');
      setBio(profile.bio || '');
      
      // If they already have first and last name, they might not need to be here
      // But we allow them to stay if they navigated here manually
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and Last name are required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateProfile({
        firstName,
        lastName,
        universityId,
        department,
        bio,
      });
      router.push('/app/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your name and details to get started. You can change these later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="universityId">University / Organization ID</Label>
                <Input
                  id="universityId"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a few sentences about yourself..."
                rows={4}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-sm text-red-500">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end pt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and Continue
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}