import { useCallback, useEffect, useMemo, useState } from 'react';
import { AIModel } from '@/src/lib/types';
import { gatewayApi } from '@/src/lib/api/gateway';
import { toast } from 'sonner';

interface UseAiSettingsOptions {
  accessToken?: string;
}

export function useAiSettings({ accessToken }: UseAiSettingsOptions) {
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [isAiModelsLoading, setIsAiModelsLoading] = useState(false);
  const [selectedAiModelId, setSelectedAiModelId] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [isDeletingApiKey, setIsDeletingApiKey] = useState(false);

  const loadAiModels = useCallback(async () => {
    if (!accessToken) {
      setAiModels([]);
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
    loadAiModels();
  }, [loadAiModels]);

  const selectedAiModel = useMemo(() => {
    if (selectedAiModelId) {
      return aiModels.find((model) => model.id === selectedAiModelId || model.modelId === selectedAiModelId) ?? null;
    }

    return aiModels[0] ?? null;
  }, [aiModels, selectedAiModelId]);

  useEffect(() => {
    if (selectedAiModel && !selectedAiModel.userKeyConfigured) {
      setApiKeyInput('');
    }
  }, [selectedAiModelId, selectedAiModel]);

  const handleSaveApiKey = useCallback(async () => {
    if (!accessToken || !selectedAiModel || !apiKeyInput.trim()) {
      return;
    }

    const modelId = selectedAiModel.modelId || selectedAiModel.id;

    setIsSavingApiKey(true);
    try {
      if (selectedAiModel.userKeyConfigured) {
        await gatewayApi.chat.updateUserApiKey(accessToken, { modelId, apiKey: apiKeyInput.trim() });
      } else {
        await gatewayApi.chat.createUserApiKey(accessToken, { modelId, apiKey: apiKeyInput.trim() });
      }
      setApiKeyInput('');
      await loadAiModels();
      toast.success('AI API key saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save AI API key');
    } finally {
      setIsSavingApiKey(false);
    }
  }, [accessToken, apiKeyInput, loadAiModels, selectedAiModel]);

  const handleDeleteApiKey = useCallback(async () => {
    if (!accessToken || !selectedAiModel) {
      return;
    }

    const modelId = selectedAiModel.modelId || selectedAiModel.id;

    setIsDeletingApiKey(true);
    try {
      await gatewayApi.chat.deleteUserApiKey(accessToken, modelId);
      await loadAiModels();
      toast.success('AI API key removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove AI API key');
    } finally {
      setIsDeletingApiKey(false);
    }
  }, [accessToken, loadAiModels, selectedAiModel]);

  return {
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
  };
}
