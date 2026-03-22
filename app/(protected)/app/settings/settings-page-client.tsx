'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useThemeColor } from '@/src/contexts/theme-color-context';
import { useAiSettings } from '@/src/hooks/app/use-ai-settings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Bell, Lock, Layout, Info, ChevronLeft, Moon, Sun, Monitor, Paintbrush, Check, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/src/features/workspace/workspace-context';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useAuth } from '@/src/contexts/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SettingsPageClient() {
  const router = useRouter();
  const { session } = useAuth();
  const { setProfileOpen } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();
  const {
    aiModels,
    isAiModelsLoading,
    selectedAiModelId,
    setSelectedAiModelId,
    selectedAiModel,
    apiKeyInput,
    setApiKeyInput,
    isSavingApiKey,
    isDeletingApiKey,
    handleSaveApiKey,
    handleDeleteApiKey,
  } = useAiSettings({ accessToken: session?.accessToken });

  const colors = [
    { name: 'zinc', class: 'bg-zinc-950 dark:bg-zinc-500', label: 'Zinc' },
    { name: 'red', class: 'bg-red-500', label: 'Red' },
    { name: 'rose', class: 'bg-rose-500', label: 'Rose' },
    { name: 'orange', class: 'bg-orange-500', label: 'Orange' },
    { name: 'green', class: 'bg-green-500', label: 'Green' },
    { name: 'blue', class: 'bg-blue-500', label: 'Blue' },
    { name: 'yellow', class: 'bg-yellow-500', label: 'Yellow' },
    { name: 'violet', class: 'bg-violet-500', label: 'Violet' },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Assistant</CardTitle>
              </div>
              <CardDescription>Manage your AI models and API keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-base">Select AI Model</Label>
                <Select
                  value={selectedAiModel?.id || selectedAiModel?.modelId || ''}
                  onValueChange={setSelectedAiModelId}
                  disabled={isAiModelsLoading || aiModels.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isAiModelsLoading ? 'Loading models...' : 'Select model'} />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((model) => {
                      const modelValue = model.id || model.modelId;
                      return (
                        <SelectItem key={modelValue} value={modelValue}>
                          {model.name} ({model.provider})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedAiModel ? (
                <div className="flex flex-col gap-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Key Status:</span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 border text-xs font-medium',
                        selectedAiModel.userKeyConfigured ? 'border-emerald-500/40 text-emerald-600' : 'border-border'
                      )}
                    >
                      {selectedAiModel.userKeyConfigured ? 'Your key connected' : 'No user key'}
                    </span>
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 border text-xs font-medium',
                        selectedAiModel.platformKeyAvailable ? 'border-primary/40 text-primary' : 'border-border'
                      )}
                    >
                      {selectedAiModel.platformKeyAvailable ? 'Platform key available' : 'Platform key unavailable'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Manage API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={apiKeyInput}
                        onChange={(event) => setApiKeyInput(event.target.value)}
                        placeholder={selectedAiModel?.userKeyConfigured ? 'Update API key' : 'Enter API key'}
                        className="max-w-md"
                        type="password"
                      />
                      <Button
                        onClick={handleSaveApiKey}
                        disabled={!selectedAiModel || !apiKeyInput.trim() || isSavingApiKey}
                      >
                        {isSavingApiKey ? 'Saving...' : selectedAiModel?.userKeyConfigured ? 'Update' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteApiKey}
                      disabled={!selectedAiModel?.userKeyConfigured || isDeletingApiKey}
                    >
                      {isDeletingApiKey ? 'Removing...' : 'Remove user key'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Appearance</CardTitle>
              </div>
              <CardDescription>Customize how the application looks on your device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Theme</Label>
                  <p className="text-xs text-muted-foreground">Select your preferred color theme</p>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7 rounded-md transition-all', theme === 'light' && 'bg-background shadow-sm text-primary')}
                    onClick={() => setTheme('light')}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span className="sr-only">Light</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7 rounded-md transition-all', theme === 'dark' && 'bg-background shadow-sm text-primary')}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span className="sr-only">Dark</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-7 w-7 rounded-md transition-all', theme === 'system' && 'bg-background shadow-sm text-primary')}
                    onClick={() => setTheme('system')}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    <span className="sr-only">System</span>
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base">Accent Color</Label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setThemeColor(color.name as any)}
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center ring-offset-background transition-all hover:scale-110 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        color.class,
                        themeColor === color.name && 'ring-2 ring-ring ring-offset-2 scale-110'
                      )}
                      title={color.label}
                    >
                      {themeColor === color.name && <Check className="h-4 w-4 text-white drop-shadow-md" strokeWidth={3} />}
                      <span className="sr-only">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Notifications</CardTitle>
              </div>
              <CardDescription>Configure how you receive alerts and updates</CardDescription>
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

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Account</CardTitle>
              </div>
              <CardDescription>Manage your account information and privacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4 bg-muted/20 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Profile Details</p>
                  <p className="text-xs text-muted-foreground">Update your personal information and bio</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Workspace</CardTitle>
              </div>
              <CardDescription>Customize your workspace layout and behavior</CardDescription>
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