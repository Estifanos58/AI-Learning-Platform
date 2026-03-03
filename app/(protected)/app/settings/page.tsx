'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Bell, Lock, Layout, Info, ChevronLeft, Moon, Sun, Monitor, Paintbrush } from 'lucide-react';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const router = useRouter();
  const { setProfileOpen } = useWorkspace();

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b bg-card">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
            <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 pl-2 pr-4 text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/app/workspace')}
            >
                <ChevronLeft className="h-4 w-4" />
                Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
         </div>
      </div>

      <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="space-y-1">
           <h2 className="text-2xl font-bold tracking-tight">Preferences</h2>
           <p className="text-muted-foreground">Manage your application settings and preferences.</p>
        </div>

        <div className="grid gap-6">
            {/* Appearance */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Paintbrush className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Appearance</CardTitle>
                    </div>
                    <CardDescription>
                        Customize how the application looks on your device
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Theme</Label>
                            <p className="text-xs text-muted-foreground">Select your preferred color theme</p>
                        </div>
                        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                                <Sun className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="white" size="icon" className="h-7 w-7 rounded-md shadow-sm">
                                <Moon className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                                <Monitor className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Notifications</CardTitle>
                    </div>
                    <CardDescription>
                        Configure how you receive alerts and updates
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Email Notifications</Label>
                            <p className="text-xs text-muted-foreground">Receive digest emails about activity</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">File Activity</Label>
                            <p className="text-xs text-muted-foreground">Get notified when shared files are updated</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Privacy */}
            <Card>
                <CardHeader className="pb-3">
                     <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Account</CardTitle>
                    </div>
                     <CardDescription>
                        Manage your account information and privacy
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border p-4 bg-muted/20 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Profile Details</p>
                            <p className="text-xs text-muted-foreground">Update your personal information and bio</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProfileOpen(true)}
                        >
                            Edit Profile
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Workspace */}
            <Card>
                 <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Layout className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Workspace</CardTitle>
                    </div>
                    <CardDescription>
                        Customize your workspace layout and behavior
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Sidebar Default</Label>
                            <p className="text-xs text-muted-foreground">Keep the left sidebar open on startup</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Chat Panel Default</Label>
                            <p className="text-xs text-muted-foreground">Keep the AI chat panel open on startup</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* About */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">About</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>Application Version</span>
                            <span className="font-mono text-xs text-foreground">v0.1.0-alpha</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Build ID</span>
                            <span className="font-mono text-xs text-foreground">b-20240301</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
