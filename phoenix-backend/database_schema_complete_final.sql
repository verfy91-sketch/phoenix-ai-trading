-- =====================================================
-- Phoenix AI Trading System - Complete Database Schema
-- =====================================================
-- This script creates ALL required tables safely

-- 1. users table (core authentication) - MOST IMPORTANT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          created_at TIMESTAMPTZ DEFAULT now(),
          last_login TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    END IF;
END $$;

-- 2. user_api_keys table (broker connections)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_api_keys' AND table_schema = 'public') THEN
        CREATE TABLE user_api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          broker_name TEXT NOT NULL,
          api_key TEXT NOT NULL,
          secret_key TEXT,
          environment TEXT DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
    END IF;
END $$;

-- 3. orders table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        CREATE TABLE orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          engine_order_id INTEGER,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
          type TEXT NOT NULL CHECK (type IN ('market', 'limit', 'stop')),
          quantity DECIMAL(20,8) NOT NULL,
          price DECIMAL(20,8),
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'partial')),
          filled_at TIMESTAMPTZ,
          cancelled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    END IF;
END $$;

-- 4. trades table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades' AND table_schema = 'public') THEN
        CREATE TABLE trades (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL,
          side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
          quantity DECIMAL(20,8) NOT NULL,
          price DECIMAL(20,8) NOT NULL,
          fee DECIMAL(20,8) DEFAULT 0,
          executed_at TIMESTAMPTZ DEFAULT now(),
          created_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
        CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    END IF;
END $$;

-- 5. portfolios table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolios' AND table_schema = 'public') THEN
        CREATE TABLE portfolios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          balance DECIMAL(20,8) DEFAULT 0,
          total_value DECIMAL(20,8) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
    END IF;
END $$;

-- 6. positions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions' AND table_schema = 'public') THEN
        CREATE TABLE positions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          symbol TEXT NOT NULL,
          quantity DECIMAL(20,8) NOT NULL,
          avg_price DECIMAL(20,8) NOT NULL,
          unrealized_pnl DECIMAL(20,8) DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, symbol)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
        CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
    END IF;
END $$;

-- 7. ai_models table (AI model storage)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_models' AND table_schema = 'public') THEN
        CREATE TABLE ai_models (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('lstm', 'cnn', 'transformer', 'xgboost', 'ensemble')),
          version TEXT NOT NULL,
          market TEXT NOT NULL,
          training_date TIMESTAMPTZ DEFAULT now(),
          accuracy FLOAT,
          file_path TEXT,
          is_active BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_ai_models_market ON ai_models(market);
        CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
    END IF;
END $$;

-- 8. absorbed_strategies table (external strategy absorption)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'absorbed_strategies' AND table_schema = 'public') THEN
        CREATE TABLE absorbed_strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source TEXT NOT NULL,
          source_url TEXT,
          title TEXT,
          author TEXT,
          raw_content TEXT,
          parsed_content JSONB,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          submitted_by UUID REFERENCES auth.users(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          approved_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_source ON absorbed_strategies(source);
        CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_status ON absorbed_strategies(status);
    END IF;
END $$;

-- 9. parsing_queue table (strategy processing queue)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsing_queue' AND table_schema = 'public') THEN
        CREATE TABLE parsing_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          strategy_id UUID REFERENCES absorbed_strategies(id) ON DELETE CASCADE,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          retries INTEGER DEFAULT 0,
          error TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          processed_at TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_parsing_queue_status ON parsing_queue(status);
    END IF;
END $$;

-- 10. evolved_strategies table (genetic algorithm results)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evolved_strategies' AND table_schema = 'public') THEN
        CREATE TABLE evolved_strategies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          parent_ids UUID[],
          code JSONB,
          parameters JSONB,
          fitness FLOAT,
          is_active BOOLEAN DEFAULT false,
          market TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_evolved_strategies_market ON evolved_strategies(market);
        CREATE INDEX IF NOT EXISTS idx_evolved_strategies_active ON evolved_strategies(is_active);
    END IF;
END $$;

-- 11. market_regimes table (market regime detection)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_regimes' AND table_schema = 'public') THEN
        CREATE TABLE market_regimes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          market TEXT NOT NULL,
          regime TEXT CHECK (regime IN ('trending_up', 'trending_down', 'ranging', 'volatile')),
          confidence FLOAT,
          detected_at TIMESTAMPTZ DEFAULT now(),
          created_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_market_regimes_market ON market_regimes(market);
    END IF;
END $$;

-- 12. trading_signals table (trading signal generation)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trading_signals' AND table_schema = 'public') THEN
        CREATE TABLE trading_signals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          market TEXT NOT NULL,
          direction TEXT CHECK (direction IN ('buy', 'sell', 'hold')),
          confidence FLOAT,
          price DECIMAL(20,8),
          strategy_id UUID REFERENCES evolved_strategies(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          executed_at TIMESTAMPTZ,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed')),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_trading_signals_user_id ON trading_signals(user_id);
        CREATE INDEX IF NOT EXISTS idx_trading_signals_market ON trading_signals(market);
        CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);
    END IF;
END $$;

-- 13. system_config table (system configuration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config' AND table_schema = 'public') THEN
        CREATE TABLE system_config (
          key TEXT PRIMARY KEY,
          value TEXT,
          type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'timestamp')),
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
    END IF;
END $$;

-- Insert essential system configuration
INSERT INTO system_config (key, value, type, description) VALUES
  ('quantconnect_api_key', '', 'string', 'API key for QuantConnect community algorithms'),
  ('auto_train_enabled', 'true', 'boolean', 'Enable automatic AI model retraining'),
  ('auto_train_frequency_hours', '168', 'number', 'Frequency in hours for automatic retraining (168 = weekly)'),
  ('python_service_url', 'https://phoenix-trainer.onrender.com', 'string', 'URL of Python training service'),
  ('newsapi_api_key', '3a2b1c4d5e6f7g8h9i0j1k2l3m4n5o6p', 'string', 'NewsAPI key for sentiment analysis'),
  ('alpha_vantage_api_key', '7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m', 'string', 'Alpha Vantage API key for economic data')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- Complete Schema Creation Done!
-- =====================================================
