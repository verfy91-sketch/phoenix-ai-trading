-- =====================================================
-- Phoenix AI Trading System - Complete Schema Creation
-- =====================================================
-- This script safely creates all required tables using IF NOT EXISTS
-- Run this in Supabase SQL Editor to fix missing tables

-- 1. ai_models (MISSING - Primary Issue)
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lstm', 'cnn', 'transformer', 'xgboost', 'ensemble')),
  version TEXT NOT NULL,
  market TEXT NOT NULL,
  training_date TIMESTAMPTZ DEFAULT now(),
  accuracy FLOAT,
  file_path TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. absorbed_strategies
CREATE TABLE IF NOT EXISTS absorbed_strategies (
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
  approved_at TIMESTAMPTZ
);

-- 3. parsing_queue
CREATE TABLE IF NOT EXISTS parsing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES absorbed_strategies(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retries INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 4. evolved_strategies
CREATE TABLE IF NOT EXISTS evolved_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_ids UUID[],
  code JSONB,
  parameters JSONB,
  fitness FLOAT,
  is_active BOOLEAN DEFAULT false,
  market TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. market_regimes
CREATE TABLE IF NOT EXISTS market_regimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL,
  regime TEXT CHECK (regime IN ('trending_up', 'trending_down', 'ranging', 'volatile')),
  confidence FLOAT,
  detected_at TIMESTAMPTZ DEFAULT now()
);

-- 6. trading_signals
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  market TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('buy', 'sell', 'hold')),
  confidence FLOAT,
  price DECIMAL(20,8),
  strategy_id UUID REFERENCES evolved_strategies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'cancelled', 'failed'))
);

-- 7. system_config (ensure it exists and add essential keys)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'timestamp')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Essential system configuration keys
INSERT INTO system_config (key, value, type, description) VALUES
  ('quantconnect_api_key', '', 'string', 'API key for QuantConnect community algorithms'),
  ('auto_train_enabled', 'true', 'boolean', 'Enable automatic AI model retraining'),
  ('auto_train_frequency_hours', '168', 'number', 'Frequency in hours for automatic retraining (168 = weekly)'),
  ('python_service_url', 'https://phoenix-trainer.onrender.com', 'string', 'URL of Python training service'),
  ('newsapi_api_key', '3a2b1c4d5e6f7g8h9i0j1k2l3m4n5o6p', 'string', 'NewsAPI key for sentiment analysis'),
  ('alpha_vantage_api_key', '7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m', 'string', 'Alpha Vantage API key for economic data')
ON CONFLICT (key) DO NOTHING;

-- 8. Enable RLS for all new tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE absorbed_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolved_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_regimes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for ai_models
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_models' 
        AND policyname = 'Admins can view all AI models'
    ) THEN
        CREATE POLICY "Admins can view all AI models" ON ai_models
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid() 
              AND auth.users.raw_user_meta_data->>'role' = 'admin'
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_models' 
        AND policyname = 'Admins can manage AI models'
    ) THEN
        CREATE POLICY "Admins can manage AI models" ON ai_models
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE auth.users.id = auth.uid() 
              AND auth.users.raw_user_meta_data->>'role' = 'admin'
            )
          );
    END IF;
END $$;

-- 10. Create indexes for performance (only if columns exist)
DO $$
BEGIN
    -- ai_models indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_models' AND column_name = 'market') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_models_market ON ai_models(market);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_models' AND column_name = 'type') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_models_type ON ai_models(type);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_models' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_models_active ON ai_models(is_active);
    END IF;

    -- absorbed_strategies indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absorbed_strategies' AND column_name = 'source') THEN
        CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_source ON absorbed_strategies(source);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absorbed_strategies' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_status ON absorbed_strategies(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absorbed_strategies' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_created ON absorbed_strategies(created_at);
    END IF;

    -- parsing_queue indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_queue' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_parsing_queue_status ON parsing_queue(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parsing_queue' AND column_name = 'strategy_id') THEN
        CREATE INDEX IF NOT EXISTS idx_parsing_queue_strategy ON parsing_queue(strategy_id);
    END IF;

    -- evolved_strategies indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evolved_strategies' AND column_name = 'market') THEN
        CREATE INDEX IF NOT EXISTS idx_evolved_strategies_market ON evolved_strategies(market);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evolved_strategies' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_evolved_strategies_active ON evolved_strategies(is_active);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evolved_strategies' AND column_name = 'fitness') THEN
        CREATE INDEX IF NOT EXISTS idx_evolved_strategies_fitness ON evolved_strategies(fitness DESC);
    END IF;

    -- market_regimes indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_regimes' AND column_name = 'market') THEN
        CREATE INDEX IF NOT EXISTS idx_market_regimes_market ON market_regimes(market);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'market_regimes' AND column_name = 'detected_at') THEN
        CREATE INDEX IF NOT EXISTS idx_market_regimes_detected ON market_regimes(detected_at DESC);
    END IF;

    -- trading_signals indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_signals' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_trading_signals_user ON trading_signals(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_signals' AND column_name = 'market') THEN
        CREATE INDEX IF NOT EXISTS idx_trading_signals_market ON trading_signals(market);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_signals' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trading_signals' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_trading_signals_created ON trading_signals(created_at DESC);
    END IF;
END $$;

-- =====================================================
-- Schema Creation Complete!
-- =====================================================
