-- =====================================================
-- Strategy Absorption System Schema
-- =====================================================

-- Create absorbed_strategies table
CREATE TABLE IF NOT EXISTS absorbed_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('tradingview', 'quantconnect')),
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  raw_content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  error_message TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for absorbed_strategies
ALTER TABLE absorbed_strategies ENABLE ROW LEVEL SECURITY;

-- Create parsing_queue table
CREATE TABLE IF NOT EXISTS parsing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id UUID REFERENCES absorbed_strategies(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for parsing_queue
ALTER TABLE parsing_queue ENABLE ROW LEVEL SECURITY;

-- Create evolved_strategies table
CREATE TABLE IF NOT EXISTS evolved_strategies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_strategy_id UUID REFERENCES absorbed_strategies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  generation INTEGER DEFAULT 1,
  fitness_score DECIMAL(5, 4),
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'testing', 'active', 'inactive', 'failed')),
  backtest_results JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for evolved_strategies
ALTER TABLE evolved_strategies ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_source ON absorbed_strategies(source);
CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_status ON absorbed_strategies(status);
CREATE INDEX IF NOT EXISTS idx_absorbed_strategies_scraped_at ON absorbed_strategies(scraped_at);
CREATE INDEX IF NOT EXISTS idx_parsing_queue_status ON parsing_queue(status);
CREATE INDEX IF NOT EXISTS idx_parsing_queue_priority ON parsing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_evolved_strategies_status ON evolved_strategies(status);
CREATE INDEX IF NOT EXISTS idx_evolved_strategies_fitness ON evolved_strategies(fitness_score DESC);

-- Create policies for absorbed_strategies
CREATE POLICY "Admins can view all absorbed strategies" ON absorbed_strategies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage absorbed strategies" ON absorbed_strategies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create policies for parsing_queue
CREATE POLICY "Admins can view parsing queue" ON parsing_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage parsing queue" ON parsing_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create policies for evolved_strategies
CREATE POLICY "Admins can view evolved strategies" ON evolved_strategies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage evolved strategies" ON evolved_strategies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
