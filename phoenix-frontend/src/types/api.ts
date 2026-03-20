export interface ApiKey {
  id: string;
  brokerName: string;
  environment: 'sandbox' | 'production';
  isActive: boolean;
  createdAt: string;
  lastUsed?: string;
}

export interface ApiKeyRequest {
  brokerName: string;
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
}

export interface SystemMetrics {
  uptime: number;
  cpu: number;
  memory: number;
  activeConnections: number;
  totalOrders: number;
  totalUsers: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  service?: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'STOPPED';
  performance?: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StrategyConfig {
  name: string;
  description?: string;
  symbols: string[];
  parameters: Record<string, any>;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

// Re-export User from user types for convenience
export type { User } from './user';
