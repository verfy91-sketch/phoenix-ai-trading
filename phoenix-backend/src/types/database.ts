export interface User {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'user' | 'admin' | 'moderator';
  created_at: string;
  last_login?: string;
  is_active?: boolean;
}

export interface ApiKey {
  id: string;
  user_id: string;
  broker_name: string;
  encrypted_api_key: string;
  encrypted_api_secret: string;
  encryption_iv: string;
  encryption_tag: string;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  engine_order_id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  price: number;
  quantity: number;
  status: 'submitted' | 'filled' | 'cancelled' | 'rejected';
  created_at: string;
  filled_at?: string;
  cancelled_at?: string;
}

export interface Trade {
  id: string;
  user_id: string;
  order_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  executed_at: string;
}

export interface Portfolio {
  id: string;
  user_id: string;
  balance: number;
  total_value: number;
  positions: Position[];
  unrealized_pnl: number;
  realized_pnl: number;
  created_at: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  unrealized_pnl: number;
  created_at: string;
}

export interface Performance {
  user_id: string;
  total_trades: number;
  winning_trades: number;
  win_rate: number;
  total_pnl: number;
  sharpe_ratio: number;
  max_drawdown: number;
  calculated_at: string;
}
