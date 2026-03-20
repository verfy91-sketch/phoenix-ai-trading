import { apiClient } from './client';
import { Order, OrderRequest, MarketData, ApiResponse } from '@/types/trading';

export const tradingApi = {
  // Orders
  getOrders: async (params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<ApiResponse<Order[]>> => {
    return apiClient.get('/trading/orders', params);
  },

  submitOrder: async (order: OrderRequest): Promise<ApiResponse<{ orderId: string }>> => {
    return apiClient.post('/trading/orders', order);
  },

  cancelOrder: async (orderId: string): Promise<ApiResponse<null>> => {
    return apiClient.delete(`/trading/orders/${orderId}`);
  },

  getOrderHistory: async (params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Order[]>> => {
    return apiClient.get('/trading/orders/history', params);
  },

  // Market Data
  getMarketData: async (symbol: string): Promise<ApiResponse<MarketData>> => {
    return apiClient.get(`/trading/market-data/${symbol}`);
  },

  getAvailableSymbols: async (): Promise<ApiResponse<string[]>> => {
    return apiClient.get('/trading/symbols');
  },

  // Portfolio
  getPortfolio: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/trading/portfolio');
  },

  getPerformance: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/trading/performance');
  },
};
