'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '../workspace-context';
import { useAuth } from '@/src/contexts/auth';
import { UserProfile, ProfileVisibility } from '@/src/lib/types';
import { useGatewayProfile } from '@/src/hooks/use-gateway';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Briefcase, Calendar, Award, Edit2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ProfileModal() {
  const { isProfileOpen, setProfileOpen } = useWorkspace();
    const { user, session } = useAuth();
    const {
        profile: serverProfile,
        isLoading: isProfileLoading,
        error: profileLoadError,
        refresh,
        updateProfile,
        updateVisibility,
    } = useGatewayProfile(session?.accessToken);
  const [activeTab, setActiveTab] = useState("view");
    const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    universityId: '',
    department: '',
    bio: '',
    visibility: 'PRIVATE' as ProfileVisibility
  });

  useEffect(() => {
    if (isProfileOpen) {
            refresh();
      setActiveTab("view");
      setError(null);
      setSaveSuccess(false);
    }
    }, [isProfileOpen, user?.id, refresh]);

    useEffect(() => {
        if (!serverProfile) return;
        setProfile(serverProfile);
        setFormData({
            firstName: serverProfile.firstName,
            lastName: serverProfile.lastName,
            universityId: serverProfile.universityId,
            department: serverProfile.department,
            bio: serverProfile.bio,
            visibility: serverProfile.visibility,
        });
    }, [serverProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
            const updatedProfile = await updateProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                universityId: formData.universityId,
                department: formData.department,
                bio: formData.bio,
            });

            if (profile?.visibility !== formData.visibility) {
                await updateVisibility(formData.visibility);
            }

      setProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setActiveTab("view"), 1000); // Switch back to view after success
    } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const initials = profile ? `${profile.firstName[0]}${profile.lastName[0]}` : user.username.substring(0, 2).toUpperCase();

  return (
    <Dialog open={isProfileOpen} onOpenChange={setProfileOpen}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">User Profile</DialogTitle>
            <DialogDescription>
                Manage your public presence and account details.
            </DialogDescription>
        </DialogHeader>

          {isProfileLoading ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-sm text-muted-foreground">Loading profile...</p>
             </div>
        ) : (
             <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pb-2 border-b">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="view">Overview</TabsTrigger>
                        <TabsTrigger value="edit">Edit Profile</TabsTrigger>
                    </TabsList>
                </div>

                {/* VIEW TAB */}
                <TabsContent value="view" className="flex-1 overflow-y-auto p-6 m-0 space-y-6">
                    {profile ? (
                        <>
                            {/* Header Section */}
                            <div className="flex items-start gap-4">
                                <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
                                    <AvatarImage alt={profile.firstName} />
                                    <AvatarFallback className="text-xl bg-primary/10 text-primary">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1 pt-1 flex-1">
                                    <h2 className="text-2xl font-bold leading-none">{profile.firstName} {profile.lastName}</h2>
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <User className="h-3.5 w-3.5" /> 
                                        @{user.email}
                                    </p>
                                    <div className="pt-1">
                                         <Badge variant={profile.visibility === 'PUBLIC' ? "default" : "secondary"} className="text-[10px] h-5">
                                            {profile.visibility.replace('_', ' ')}
                                         </Badge>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setActiveTab('edit')}>
                                    <Edit2 className="h-3.5 w-3.5 mr-2" />
                                    Edit
                                </Button>
                            </div>

                            <Separator />

                            {/* Bio */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
                                <p className="text-sm leading-relaxed">
                                    {profile.bio || <span className="text-muted-foreground italic">No bio provided.</span>}
                                </p>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <div className="space-y-1">
                                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                                        <Briefcase className="h-3.5 w-3.5" /> University ID
                                    </span>
                                    <p className="text-sm font-medium pl-5.5">{profile.universityId || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase">
                                        <MapPin className="h-3.5 w-3.5" /> Department
                                    </span>
                                    <p className="text-sm font-medium pl-5.5">{profile.department || "—"}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="bg-muted/30 rounded-lg p-4 space-y-3 border">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Award className="h-4 w-4 text-primary" /> 
                                    Learning Stats
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background p-3 rounded shadow-sm border text-center">
                                        <div className="text-2xl font-bold text-primary">{profile.reputationScore}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-medium">Reputation</div>
                                    </div>
                                    <div className="bg-background p-3 rounded shadow-sm border text-center">
                                        <div className="text-2xl font-bold text-blue-600">{profile.completionScore}%</div>
                                        <div className="text-[10px] text-muted-foreground uppercase font-medium">Completion</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                         <div className="text-center py-10 text-muted-foreground">Profile data unavailable.</div>
                    )}
                </TabsContent>

                {/* EDIT TAB */}
                <TabsContent value="edit" className="flex-1 overflow-y-auto p-6 m-0 space-y-4">
                     {saveSuccess && (
                        <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300">
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>Profile updated successfully!</AlertDescription>
                        </Alert>
                    )}
                    
                    {error && (
                        <Alert variant="destructive">
                             <AlertCircle className="h-4 w-4" />
                             <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                                        {profileLoadError && !error && (
                                            <Alert variant="destructive">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>{profileLoadError}</AlertDescription>
                                            </Alert>
                                        )}

                    <form id="profile-form" onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">First Name</label>
                                <Input 
                                    value={formData.firstName}
                                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Last Name</label>
                                <Input 
                                    value={formData.lastName}
                                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">University ID</label>
                                <Input 
                                    value={formData.universityId}
                                    onChange={e => setFormData({...formData, universityId: e.target.value})}
                                    placeholder="e.g. 2024001"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Department</label>
                                <Input 
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                    placeholder="e.g. Computer Science"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bio</label>
                            <Textarea 
                                value={formData.bio}
                                onChange={e => setFormData({...formData, bio: e.target.value})}
                                className="min-h-[100px] resize-none"
                                placeholder="Tell us about yourself..."
                                disabled={isSaving}
                            />
                            <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/2000</p>
                        </div>

                         <div className="space-y-2">
                            <label className="text-sm font-medium">Visibility</label>
                            <Select 
                                value={formData.visibility} 
                                onValueChange={(val) => setFormData({...formData, visibility: val as ProfileVisibility})}
                                disabled={isSaving}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PUBLIC">Public</SelectItem>
                                    <SelectItem value="UNIVERSITY_ONLY">University Only</SelectItem>
                                    <SelectItem value="PRIVATE">Private</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setActiveTab('view')} disabled={isSaving}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </TabsContent>
             </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
