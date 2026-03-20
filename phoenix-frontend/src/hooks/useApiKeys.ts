'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiKey, ApiKeyRequest } from '@/types/api';
import { apiClient } from '@/lib/api/client';

interface UseApiKeysReturn {
  apiKeys: ApiKey[] | undefined;
  isLoading: boolean;
  error: Error | null;
  createApiKey: (data: ApiKeyRequest) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  updateApiKey: (id: string, data: Partial<ApiKeyRequest>) => Promise<void>;
  isCreating: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function useApiKeys(): UseApiKeysReturn {
  const queryClient = useQueryClient();

  // Fetch API keys
  const {
    data: apiKeys,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await apiClient.get<ApiKey[]>('/api-keys');
      return response || [];
    },
  });

  // Create API key mutation
  const createMutation = useMutation({
    mutationFn: async (data: ApiKeyRequest) => {
      const response = await apiClient.post<ApiKey>('/api-keys', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  // Delete API key mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  // Update API key mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApiKeyRequest> }) => {
      const response = await apiClient.put<ApiKey>(`/api-keys/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const createApiKey = async (data: ApiKeyRequest) => {
    await createMutation.mutateAsync(data);
  };

  const deleteApiKey = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const updateApiKey = async (id: string, data: Partial<ApiKeyRequest>) => {
    await updateMutation.mutateAsync({ id, data });
  };

  return {
    apiKeys,
    isLoading,
    error: error as Error | null,
    createApiKey,
    deleteApiKey,
    updateApiKey,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
