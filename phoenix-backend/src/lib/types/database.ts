/**
 * Database type definitions for Phoenix AI Trading System
 */

export interface Database {
  public: {
    Tables: {
      ai_models: {
        Row: {
          id: number;
          market: string;
          model_name: string;
          model_url: string;
          accuracy: number;
          precision: number;
          recall: number;
          f1_score: number;
          feature_count: number;
          training_date: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_models']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['ai_models']['Row']>;
      };
      historical_data: {
        Row: {
          id: number;
          broker: string;
          market: string;
          timestamp: string;
          open_price: number;
          high_price: number;
          low_price: number;
          close_price: number;
          volume: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['historical_data']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['historical_data']['Row']>;
      };
      news_sentiment_cache: {
        Row: {
          id: number;
          market: string;
          sentiment_score: number;
          confidence: number;
          article_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['news_sentiment_cache']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['news_sentiment_cache']['Row']>;
      };
      economic_indicators_cache: {
        Row: {
          id: number;
          country: string;
          indicator_type: string;
          interest_rate?: number;
          inflation_rate?: number;
          gdp_growth?: number;
          unemployment_rate?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['economic_indicators_cache']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['economic_indicators_cache']['Row']>;
      };
      social_sentiment_cache: {
        Row: {
          id: number;
          market: string;
          platform: string;
          sentiment_score: number;
          volume: number;
          engagement: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['social_sentiment_cache']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['social_sentiment_cache']['Row']>;
      };
      system_config: {
        Row: {
          id: number;
          key: string;
          value: string;
          type: 'string' | 'number' | 'boolean' | 'timestamp';
          description?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['system_config']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['system_config']['Row']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      user_profiles: {
        Row: {
          id: number;
          user_id: string;
          full_name?: string;
          company?: string;
          risk_tolerance?: string;
          trading_experience?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Row']>;
      };
      api_keys: {
        Row: {
          id: number;
          user_id: string;
          broker: string;
          key_name: string;
          api_key: string;
          api_secret?: string;
          is_active: boolean;
          last_used?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['api_keys']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['api_keys']['Row']>;
      };
      strategies: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          description?: string;
          market: string;
          strategy_type: string;
          config: Record<string, any>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['strategies']['Row']>;
      };
      trades: {
        Row: {
          id: number;
          user_id: string;
          strategy_id?: number;
          market: string;
          side: 'BUY' | 'SELL';
          quantity: number;
          price: number;
          type: 'MARKET' | 'LIMIT' | 'STOP';
          status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';
          pnl?: number;
          fees: number;
          broker_order_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['trades']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['trades']['Row']>;
      };
      portfolio_snapshots: {
        Row: {
          id: number;
          user_id: string;
          total_value: number;
          cash_balance: number;
          positions_value: number;
          daily_pnl: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['portfolio_snapshots']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['portfolio_snapshots']['Row']>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
