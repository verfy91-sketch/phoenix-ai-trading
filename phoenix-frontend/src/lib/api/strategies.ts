import { apiClient } from './client';
import { Strategy, StrategyConfig, ApiResponse } from '@/types/api';

export const strategiesApi = {
  getStrategies: async (): Promise<ApiResponse<Strategy[]>> => {
    return apiClient.get('/strategies');
  },

  getStrategy: async (id: string): Promise<ApiResponse<Strategy>> => {
    return apiClient.get(`/strategies/${id}`);
  },

  createStrategy: async (data: StrategyConfig): Promise<ApiResponse<Strategy>> => {
    return apiClient.post('/strategies', data);
  },

  updateStrategy: async (id: string, data: Partial<StrategyConfig>): Promise<ApiResponse<Strategy>> => {
    return apiClient.put(`/strategies/${id}`, data);
  },

  deleteStrategy: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient.delete(`/strategies/${id}`);
  },

  startStrategy: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient.post(`/strategies/${id}/start`);
  },

  stopStrategy: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient.post(`/strategies/${id}/stop`);
  },

  getStrategyPerformance: async (id: string): Promise<ApiResponse<any>> => {
    return apiClient.get(`/strategies/${id}/performance`);
  },
};
