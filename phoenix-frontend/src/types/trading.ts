export interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  price?: number;
  stopPrice?: number;
  quantity: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  filledQuantity?: number;
  remainingQuantity?: number;
  averagePrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  side: 'LONG' | 'SHORT';
  createdAt: string;
}

export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executedAt: string;
  fee?: number;
  pnl?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
  change?: number;
  changePercent?: number;
}

export interface Portfolio {
  balance: number;
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  positions: Position[];
  margin?: number;
  freeMargin?: number;
  marginLevel?: number;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: number;
  price?: number;
  stopPrice?: number;
}

export interface Performance {
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnL: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}
