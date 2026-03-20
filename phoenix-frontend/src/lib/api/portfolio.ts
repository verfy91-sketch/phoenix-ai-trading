import { apiClient } from './client';
import { Portfolio, Trade, Performance, ApiResponse } from '@/types/trading';

export const portfolioApi = {
  getPortfolio: async (): Promise<ApiResponse<Portfolio>> => {
    return apiClient.get('/portfolio');
  },

  getHistory: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Trade[]>> => {
    return apiClient.get('/portfolio/history', params);
  },

  getPerformance: async (): Promise<ApiResponse<Performance>> => {
    return apiClient.get('/portfolio/performance');
  },

  getPositions: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/portfolio/positions');
  },
};
