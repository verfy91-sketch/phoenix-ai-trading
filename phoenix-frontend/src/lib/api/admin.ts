import { apiClient } from './client';
import { User, ApiKey, SystemMetrics, LogEntry, ApiResponse } from '@/types/api';

export const adminApi = {
  // Users
  getUsers: async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    role?: string;
  }): Promise<ApiResponse<User[]>> => {
    return apiClient.get('/admin/users', params);
  },

  updateUserRole: async (userId: string, role: string): Promise<ApiResponse<User>> => {
    return apiClient.put(`/admin/users/${userId}/role`, { role });
  },

  deactivateUser: async (userId: string): Promise<ApiResponse<null>> => {
    return apiClient.post(`/admin/users/${userId}/deactivate`);
  },

  activateUser: async (userId: string): Promise<ApiResponse<null>> => {
    return apiClient.post(`/admin/users/${userId}/activate`);
  },

  // System
  getSystemMetrics: async (): Promise<ApiResponse<SystemMetrics>> => {
    return apiClient.get('/admin/system/metrics');
  },

  getSystemLogs: async (params?: {
    limit?: number;
    offset?: number;
    level?: string;
    service?: string;
  }): Promise<ApiResponse<LogEntry[]>> => {
    return apiClient.get('/admin/system/logs', params);
  },

  getSystemStats: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/system/stats');
  },

  // API Keys
  getUserApiKeys: async (userId: string): Promise<ApiResponse<ApiKey[]>> => {
    return apiClient.get(`/admin/users/${userId}/api-keys`);
  },

  // Health
  getHealthStatus: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/health');
  },
};
