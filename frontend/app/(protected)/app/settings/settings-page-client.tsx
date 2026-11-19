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
import { useEffect, useState } from 'react';
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
    providers,
    providerAccounts,
    isAiModelsLoading,
    isProvidersLoading,
    isAccountsLoading,
    selectedAiModelId,
    setSelectedAiModelId,
    selectedAiModel,
    isCreatingModel,
    handleCreateModel,
    isAttachingProvider,
    handleAttachProvider,
    isCreatingProviderAccount,
    handleCreateProviderAccount,
  } = useAiSettings({ accessToken: session?.accessToken });

  const [newModelName, setNewModelName] = useState('');
  const [newModelFamily, setNewModelFamily] = useState('');
  const [newModelContextLength, setNewModelContextLength] = useState('8192');
  const [newModelCapabilitiesJson, setNewModelCapabilitiesJson] = useState('');

  const [providerModelId, setProviderModelId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerModelName, setProviderModelName] = useState('');
  const [providerPriority, setProviderPriority] = useState('0');

  const [accountProviderName, setAccountProviderName] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [accountApiKey, setAccountApiKey] = useState('');
  const [accountRateLimitPerMinute, setAccountRateLimitPerMinute] = useState('60');
  const [accountDailyQuota, setAccountDailyQuota] = useState('10000');

  const effectiveProviderModelId = providerModelId || selectedAiModelId;

  const onCreateModel = async () => {
    if (!newModelName || !newModelFamily) return;
    try {
      await handleCreateModel({
        modelName: newModelName,
        family: newModelFamily,
        contextLength: Number(newModelContextLength) || 8192,
        capabilitiesJson: newModelCapabilitiesJson || undefined,
        active: true,
      });
      setNewModelName('');
      setNewModelFamily('');
      setNewModelContextLength('8192');
      setNewModelCapabilitiesJson('');
    } catch {
      // handled in hook
    }
  };

  const onAttachProvider = async () => {
    if (!effectiveProviderModelId || !providerName || !providerModelName) return;
    try {
      await handleAttachProvider({
        modelId: effectiveProviderModelId,
        providerName,
        providerModelName,
        priority: Number(providerPriority) || 0,
        active: true,
      });
      setProviderName('');
      setProviderModelName('');
      setProviderPriority('0');
    } catch {
      // handled in hook
    }
  };

  const onCreateProviderAccount = async () => {
    if (!accountProviderName || !accountLabel || !accountApiKey) return;
    try {
      await handleCreateProviderAccount({
        providerName: accountProviderName,
        accountLabel,
        apiKey: accountApiKey,
        rateLimitPerMinute: Number(accountRateLimitPerMinute) || 60,
        dailyQuota: Number(accountDailyQuota) || 10000,
        active: true,
      });
      setAccountLabel('');
      setAccountApiKey('');
    } catch {
      // handled in hook
    }
  };

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
                <CardTitle className="text-lg">AI Models</CardTitle>
              </div>
              <CardDescription>Select models and review provider bindings for each model</CardDescription>
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
                          {model.modelName} ({model.family || model.provider})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedAiModel ? (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="rounded px-2 py-0.5 border text-xs font-medium border-primary/40 text-primary">
                      {selectedAiModel.modelName}
                    </span>
                    <span className="rounded px-2 py-0.5 border text-xs font-medium border-border">
                      Family: {selectedAiModel.family || selectedAiModel.provider}
                    </span>
                    <span className="rounded px-2 py-0.5 border text-xs font-medium border-border">
                      Context: {selectedAiModel.contextLength}
                    </span>
                    <span className="rounded px-2 py-0.5 border text-xs font-medium border-border">
                      Providers: {selectedAiModel.providerCount ?? providers.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Attached Providers</Label>
                    {isProvidersLoading ? (
                      <p className="text-sm text-muted-foreground">Loading providers...</p>
                    ) : providers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No providers attached to this model yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {providers.map((provider) => (
                          <div key={provider.providerId} className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                            <div>
                              <p className="font-medium">{provider.providerName}</p>
                              <p className="text-xs text-muted-foreground">{provider.providerModelName}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">Priority {provider.priority}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">AI Endpoint Management</CardTitle>
              </div>
              <CardDescription>Create models, attach providers, and insert provider account API keys</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Create AI Model</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Model Name</Label>
                    <Input
                      placeholder="e.g., Gemini-Advanced"
                      value={newModelName}
                      onChange={(event) => setNewModelName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Family</Label>
                    <Input
                      placeholder="e.g., gemini"
                      value={newModelFamily}
                      onChange={(event) => setNewModelFamily(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Context Length</Label>
                    <Input
                      type="number"
                      min={0}
                      value={newModelContextLength}
                      onChange={(event) => setNewModelContextLength(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Capabilities JSON (Optional)</Label>
                    <Input
                      placeholder='{"streams":true}'
                      value={newModelCapabilitiesJson}
                      onChange={(event) => setNewModelCapabilitiesJson(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={onCreateModel}
                  disabled={!newModelName || !newModelFamily || isCreatingModel}
                >
                  {isCreatingModel ? 'Creating...' : 'Create Model'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Attach Provider To Model</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Model</Label>
                    <Select value={effectiveProviderModelId} onValueChange={setProviderModelId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {aiModels.map((model) => (
                          <SelectItem key={model.modelId} value={model.modelId}>
                            {model.modelName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Provider Name</Label>
                    <Input
                      placeholder="e.g., openai"
                      value={providerName}
                      onChange={(event) => setProviderName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Provider Model Name</Label>
                    <Input
                      placeholder="e.g., gpt-4o-mini"
                      value={providerModelName}
                      onChange={(event) => setProviderModelName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Priority</Label>
                    <Input
                      type="number"
                      min={0}
                      value={providerPriority}
                      onChange={(event) => setProviderPriority(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={onAttachProvider}
                  disabled={!effectiveProviderModelId || !providerName || !providerModelName || isAttachingProvider}
                >
                  {isAttachingProvider ? 'Attaching...' : 'Attach Provider'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Create Provider Account (API Key)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Provider Name</Label>
                    <Input
                      placeholder="e.g., openai"
                      value={accountProviderName}
                      onChange={(event) => setAccountProviderName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Account Label</Label>
                    <Input
                      placeholder="e.g., team-key-01"
                      value={accountLabel}
                      onChange={(event) => setAccountLabel(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs">API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter provider API key"
                      value={accountApiKey}
                      onChange={(event) => setAccountApiKey(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Rate Limit / Minute</Label>
                    <Input
                      type="number"
                      min={1}
                      value={accountRateLimitPerMinute}
                      onChange={(event) => setAccountRateLimitPerMinute(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Daily Quota</Label>
                    <Input
                      type="number"
                      min={1}
                      value={accountDailyQuota}
                      onChange={(event) => setAccountDailyQuota(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={onCreateProviderAccount}
                  disabled={!accountProviderName || !accountLabel || !accountApiKey || isCreatingProviderAccount}
                >
                  {isCreatingProviderAccount ? 'Creating...' : 'Create Account'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Provider Accounts</h3>
                {isAccountsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading accounts...</p>
                ) : providerAccounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No provider accounts found.</p>
                ) : (
                  <div className="space-y-2">
                    {providerAccounts.map((account) => (
                      <div key={account.accountId} className="rounded-md border p-3 text-sm flex items-center justify-between">
                        <div>
                          <p className="font-medium">{account.accountLabel}</p>
                          <p className="text-xs text-muted-foreground">{account.providerName} • {account.healthStatus}</p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{account.usedToday}/{account.dailyQuota} used</p>
                          <p>{account.rateLimitPerMinute}/min</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
