-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  log_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add AI training configuration to system_config
INSERT INTO system_config (key, value, type, description) VALUES
  ('auto_train_enabled', 'true', 'boolean', 'Enable automatic AI model retraining'),
  ('auto_train_frequency_hours', '168', 'number', 'Frequency in hours for automatic retraining (168 = weekly)'),
  ('auto_train_last_run', NULL, 'timestamp', 'Timestamp of last automatic training run'),
  ('python_service_url', 'https://phoenix-trainer.onrender.com', 'string', 'URL of Python training service'),
  ('newsapi_api_key', '3a2b1c4d5e6f7g8h9i0j1k2l3m4n5o6p', 'string', 'NewsAPI key for sentiment analysis'),
  ('alpha_vantage_api_key', '7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m', 'string', 'Alpha Vantage API key for economic data'),
  ('reddit_client_id', 'abc123xyz', 'string', 'Reddit client ID for social sentiment'),
  ('reddit_client_secret', 'def456uvw', 'string', 'Reddit client secret for social sentiment')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  updated_at = NOW();
