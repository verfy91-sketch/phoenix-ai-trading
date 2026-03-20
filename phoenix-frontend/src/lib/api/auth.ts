import { apiClient } from './client';
import { LoginCredentials, RegisterData, AuthResponse, User, ApiResponse } from '@/types/user';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient.post('/auth/login', credentials);
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    return apiClient.post('/auth/register', data);
  },

  logout: async (): Promise<ApiResponse<null>> => {
    return apiClient.post('/auth/logout');
  },

  refreshToken: async (): Promise<AuthResponse> => {
    return apiClient.post('/auth/refresh');
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/auth/me');
  },

  updateProfile: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    return apiClient.put('/auth/me', data);
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<null>> => {
    return apiClient.post('/auth/change-password', data);
  },

  forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (data: {
    token: string;
    newPassword: string;
  }): Promise<ApiResponse<null>> => {
    return apiClient.post('/auth/reset-password', data);
  },
};
