-- =====================================================
-- Phoenix AI Trading System - Safe Database Schema Creation
-- =====================================================
-- This script only creates missing tables, doesn't drop existing ones

-- 1. Check if evolved_strategies table exists and create if missing
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

-- 2. Check if trading_signals table exists and create if missing
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

-- 3. Check if absorbed_strategies table exists and create if missing
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

-- 4. Check if market_regimes table exists and create if missing
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

-- 5. Check if system_config table exists and create if missing
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
-- Safe Schema Creation Complete!
-- =====================================================
