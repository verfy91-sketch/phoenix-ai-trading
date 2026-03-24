-- Create system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT NOT NULL CHECK (type IN ('string', 'number', 'boolean', 'timestamp')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for system_config if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' 
        AND policyname = 'Admins can view all system config'
    ) THEN
        CREATE POLICY "Admins can view all system config" ON system_config
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' 
        AND policyname = 'Admins can manage system config'
    ) THEN
        CREATE POLICY "Admins can manage system config" ON system_config
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
    END IF;
END $$;

-- Add genetic algorithm configuration to system_config
INSERT INTO system_config (key, value, type, description) VALUES
  ('genetic_population_size', '50', 'number', 'Population size for genetic algorithm'),
  ('genetic_generations', '20', 'number', 'Number of generations for evolution'),
  ('genetic_mutation_rate', '0.1', 'number', 'Mutation rate for genetic algorithm (0.0-1.0)'),
  ('genetic_crossover_rate', '0.8', 'number', 'Crossover rate for genetic algorithm (0.0-1.0)'),
  ('genetic_elitism_count', '5', 'number', 'Number of elite individuals to keep each generation'),
  ('genetic_tournament_size', '3', 'number', 'Tournament size for selection')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  updated_at = NOW();
