/**
 * Environment validation utility
 * Ensures all required environment variables are present and valid
 */

export interface EnvironmentVariable {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

const requiredVariables: EnvironmentVariable[] = [
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Application environment (development, production, test)',
    validator: (value) => ['development', 'production', 'test'].includes(value),
  },
  {
    name: 'PORT',
    required: true,
    description: 'Server port number',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536,
  },
  {
    name: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validator: (value) => value.startsWith('http') && value.includes('supabase'),
  },
  {
    name: 'SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validator: (value) => value.length > 10,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key',
    validator: (value) => value.length > 10,
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT secret for token signing',
    validator: (value) => value.length >= 32,
  },
  {
    name: 'JWT_EXPIRES_IN',
    required: true,
    description: 'JWT token expiration time',
    validator: (value) => /\d+[smhd]/.test(value),
  },
  {
    name: 'REDIS_HOST',
    required: false,
    description: 'Redis server host',
  },
  {
    name: 'REDIS_PORT',
    required: false,
    description: 'Redis server port',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
  },
  {
    name: 'ENGINE_HOST',
    required: false,
    description: 'Trading engine host',
  },
  {
    name: 'ENGINE_PORT',
    required: false,
    description: 'Trading engine port',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
  },
  {
    name: 'RATE_LIMIT_WINDOW_MS',
    required: true,
    description: 'Rate limiting window in milliseconds',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
  },
  {
    name: 'RATE_LIMIT_MAX',
    required: true,
    description: 'Maximum requests per rate limit window',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0,
  },
  {
    name: 'ENCRYPTION_KEY',
    required: true,
    description: 'Encryption key for sensitive data',
    validator: (value) => value.length >= 32,
  },
];

export function validateEnvironment(): void {
  console.log('🔍 Validating environment variables...\n');

  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];

  for (const variable of requiredVariables) {
    const value = process.env[variable.name];

    if (!value) {
      if (variable.required) {
        missing.push(variable.name);
      } else {
        warnings.push(`Optional variable ${variable.name} is not set`);
      }
      continue;
    }

    if (variable.validator && !variable.validator(value)) {
      invalid.push(`${variable.name} (invalid value: "${value}")`);
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(name => {
      const variable = requiredVariables.find(v => v.name === name);
      console.error(`   - ${name}: ${variable?.description}`);
    });
    console.error('\nPlease set these variables in your .env file');
  }

  if (invalid.length > 0) {
    console.error('❌ Invalid environment variables:');
    invalid.forEach(name => {
      const variable = requiredVariables.find(v => v.name.startsWith(v.name));
      console.error(`   - ${name}: ${variable?.description}`);
    });
    console.error('\nPlease correct these variables in your .env file');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\n❌ Environment validation failed');
    console.error('Please fix the above issues and restart the server');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
  
  // Log configuration summary (without sensitive values)
  console.log('\n📋 Configuration Summary:');
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Port: ${process.env.PORT}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Redis Host: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  console.log(`   Engine Host: ${process.env.ENGINE_HOST}:${process.env.ENGINE_PORT}`);
  console.log(`   Rate Limit: ${process.env.RATE_LIMIT_MAX} requests per ${process.env.RATE_LIMIT_WINDOW_MS}ms`);
}

export function checkSupabaseConnection(): boolean {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    return false;
  }

  // Basic URL validation
  try {
    new URL(url);
    return url.includes('supabase') && anonKey.length > 10;
  } catch {
    return false;
  }
}
