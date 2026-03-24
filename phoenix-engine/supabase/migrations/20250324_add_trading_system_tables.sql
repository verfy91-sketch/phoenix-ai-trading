-- =====================================================
-- Additional Tables for Trading System
-- =====================================================

-- Create market_regimes table
CREATE TABLE IF NOT EXISTS market_regimes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market TEXT NOT NULL,
  regime TEXT NOT NULL CHECK (regime IN ('trending', 'ranging', 'volatile')),
  confidence DECIMAL(5, 4) NOT NULL,
  indicators JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for market_regimes
ALTER TABLE market_regimes ENABLE ROW LEVEL SECURITY;

-- Create trading_signals table
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  market TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
  confidence DECIMAL(5, 4) NOT NULL,
  strategy TEXT NOT NULL,
  regime TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'executed', 'failed', 'cancelled')),
  execution_price DECIMAL(12, 4),
  execution_quantity DECIMAL(12, 4),
  broker_order_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for trading_signals
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_regimes_market_timestamp ON market_regimes(market, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_market_timestamp ON trading_signals(market, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_status ON trading_signals(status);

-- Create policies for market_regimes
CREATE POLICY "Admins can view all market regimes" ON market_regimes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage market regimes" ON market_regimes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create policies for trading_signals
CREATE POLICY "Admins can view all trading signals" ON trading_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage trading signals" ON trading_signals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
