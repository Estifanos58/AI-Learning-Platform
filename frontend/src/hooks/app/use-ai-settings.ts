import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIModel, AiProvider, AiProviderAccount } from '@/src/lib/types';
import { gatewayApi } from '@/src/lib/api/gateway';
import { toast } from 'sonner';

interface UseAiSettingsOptions {
  accessToken?: string;
}

export function useAiSettings({ accessToken }: UseAiSettingsOptions) {
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [providerAccounts, setProviderAccounts] = useState<AiProviderAccount[]>([]);
  const [isAiModelsLoading, setIsAiModelsLoading] = useState(false);
  const [isProvidersLoading, setIsProvidersLoading] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);
  const [selectedAiModelId, setSelectedAiModelId] = useState<string>('');

  const loadAiModels = useCallback(async () => {
    if (!accessToken) {
      setAiModels([]);
      setProviders([]);
      setProviderAccounts([]);
      return;
    }

    setIsAiModelsLoading(true);
    try {
      const models = await gatewayApi.chat.listAiModels(accessToken);
      setAiModels(models);

      if (models.length > 0) {
        setSelectedAiModelId((previous) => previous || models[0].id || models[0].modelId);
      }
    } catch {
      setAiModels([]);
    } finally {
      setIsAiModelsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void Promise.resolve().then(() => loadAiModels());
  }, [loadAiModels]);

  const loadProviderAccounts = useCallback(async () => {
    if (!accessToken) {
      setProviderAccounts([]);
      return;
    }

    setIsAccountsLoading(true);
    try {
      const accounts = await gatewayApi.chat.listAiProviderAccounts(accessToken);
      setProviderAccounts(accounts);
    } catch {
      setProviderAccounts([]);
    } finally {
      setIsAccountsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void Promise.resolve().then(() => loadProviderAccounts());
  }, [loadProviderAccounts]);

  const selectedAiModel = useMemo(() => {
    if (selectedAiModelId) {
      return aiModels.find((model) => model.id === selectedAiModelId || model.modelId === selectedAiModelId) ?? null;
    }

    return aiModels[0] ?? null;
  }, [aiModels, selectedAiModelId]);

  const loadProvidersForModel = useCallback(async (modelId: string) => {
    if (!accessToken || !modelId) {
      setProviders([]);
      return;
    }

    setIsProvidersLoading(true);
    try {
      const modelProviders = await gatewayApi.chat.listAiProviders(accessToken, modelId);
      setProviders(modelProviders);
    } catch {
      setProviders([]);
    } finally {
      setIsProvidersLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const resolvedModelId = selectedAiModelId || selectedAiModel?.modelId || selectedAiModel?.id;
    void Promise.resolve().then(() => {
      if (!resolvedModelId) {
        setProviders([]);
        return;
      }
      void loadProvidersForModel(resolvedModelId);
    });
  }, [loadProvidersForModel, selectedAiModel?.id, selectedAiModel?.modelId, selectedAiModelId]);

  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const handleCreateModel = useCallback(async (input: {
    modelName: string;
    family: string;
    contextLength?: number;
    capabilitiesJson?: string;
    active?: boolean;
  }) => {
    if (!accessToken) return;
    setIsCreatingModel(true);
    try {
      await gatewayApi.chat.createAiModelV2(accessToken, input);
      await loadAiModels();
      toast.success('AI Model created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create AI Model');
      throw error;
    } finally {
      setIsCreatingModel(false);
    }
  }, [accessToken, loadAiModels]);

  const [isAttachingProvider, setIsAttachingProvider] = useState(false);
  const handleAttachProvider = useCallback(async (input: {
    modelId: string;
    providerName: string;
    providerModelName: string;
    priority?: number;
    active?: boolean;
  }) => {
    if (!accessToken) return;
    setIsAttachingProvider(true);
    try {
      await gatewayApi.chat.attachAiProvider(accessToken, input);
      await loadProvidersForModel(input.modelId);
      await loadAiModels();
      toast.success('Provider attached to model');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to attach provider');
      throw error;
    } finally {
      setIsAttachingProvider(false);
    }
  }, [accessToken, loadAiModels, loadProvidersForModel]);

  const [isCreatingProviderAccount, setIsCreatingProviderAccount] = useState(false);
  const handleCreateProviderAccount = useCallback(async (input: {
    providerName: string;
    accountLabel: string;
    apiKey: string;
    rateLimitPerMinute: number;
    dailyQuota: number;
    active?: boolean;
  }) => {
    if (!accessToken) return;

    setIsCreatingProviderAccount(true);
    try {
      await gatewayApi.chat.createAiProviderAccount(accessToken, input);
      await loadProviderAccounts();
      toast.success('Provider account created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create provider account');
      throw error;
    } finally {
      setIsCreatingProviderAccount(false);
    }
  }, [accessToken, loadProviderAccounts]);

  return {
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
  };
}
