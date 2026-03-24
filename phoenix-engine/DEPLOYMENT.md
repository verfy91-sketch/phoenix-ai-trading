# Phoenix AI Trading System - Deployment Guide

This guide covers the complete deployment of the Phoenix AI Trading System across all components.

## Overview

The Phoenix AI Trading System consists of:
- **Backend API** (Node.js/Express) - Core trading engine and API
- **Frontend** (Next.js) - Trading dashboard and admin interface
- **Python AI Service** (FastAPI) - Model training and data acquisition
- **Edge Functions** (Deno) - Scheduled tasks and automation
- **C++ Engine** - High-performance trading engine
- **Supabase** - Database and storage

## Prerequisites

### Required Accounts
- [Supabase](https://supabase.com) account
- [Render](https://render.com) account (for Python service)
- [Vercel](https://vercel.com) account (for frontend)
- GitHub repository with code

### Required Tools
- Node.js 18+
- Python 3.8+
- Docker
- C++ compiler (GCC/Clang)

## Environment Setup

### 1. Supabase Configuration

1. Create a new Supabase project
2. Run the SQL setup script:
```sql
-- Run system_config.sql to set up system configuration
-- Set up tables for ai_models, historical_data, etc.
```

3. Get your Supabase credentials:
   - Project URL
   - Anon Key
   - Service Role Key

### 2. Backend Deployment

#### Environment Variables
Create `.env` file in `phoenix-backend`:

```bash
NODE_ENV=production
PORT=3001

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-32-chars

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Engine Configuration
ENGINE_HOST=localhost
ENGINE_PORT=5555

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-chars

# External API Keys
NEWSAPI_API_KEY=your-newsapi-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
QUANTCONNECT_API_KEY=your-quantconnect-api-key
```

#### Deployment Options

**Option A: Render (Recommended)**
1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install && npm run build`
4. Set start command: `npm start`
5. Add all environment variables

**Option B: Self-hosted**
```bash
cd phoenix-backend
npm install
npm run build
npm start
```

### 3. Frontend Deployment

#### Environment Variables
Create `.env.local` file in `phoenix-frontend`:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### Deployment to Vercel

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### 4. Python AI Service Deployment

#### Requirements
All dependencies are in `requirements.txt`

#### Render Deployment

1. Create `render.yaml` in `python/` directory (already provided)
2. Connect repository to Render
3. Render will automatically detect and deploy

#### Environment Variables
Render automatically sets these from `render.yaml`:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEWSAPI_API_KEY
- ALPHA_VANTAGE_API_KEY
- QUANTCONNECT_API_KEY
- PORT=8080

### 5. Edge Functions Deployment

#### Model Trainer
Deploy to Supabase Edge Functions:

```bash
cd functions/model-trainer
supabase functions deploy model-trainer
```

#### Historical Data Fetcher
```bash
cd functions/historical-data-fetcher
supabase functions deploy historical-data-fetcher
```

#### Schedule Edge Functions
In Supabase dashboard, set up cron schedules:
- `model-trainer`: Every 6 hours
- `historical-data-fetcher`: Daily at 2 AM UTC

### 6. C++ Engine Deployment

#### Build Instructions
```bash
cd phoenix-engine
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

#### Running the Engine
```bash
./build/Release/phoenix_engine --config config.json
```

## Production Configuration

### Database Setup
1. Run the SQL setup script:
```bash
psql -h your-db-host -U postgres -d postgres -f system_config.sql
```

2. Configure system settings in Supabase dashboard:
   - Set `auto_train_enabled` to `true`
   - Set `auto_train_frequency_hours` to `6`
   - Add `python_service_url` with your Render service URL

### Security Configuration
1. Enable Supabase RLS policies
2. Configure CORS settings
3. Set up API rate limiting
4. Enable SSL/TLS certificates

### Monitoring Setup
1. Set up application monitoring (e.g., Sentry)
2. Configure log aggregation
3. Set up health check endpoints
4. Monitor database performance

## Verification Steps

### 1. Backend Health Check
```bash
curl https://your-backend-url.com/health
```

### 2. Frontend Access
Visit `https://your-frontend-url.com` and verify:
- Login works
- Dashboard loads
- Trading interface functions

### 3. Python Service Health Check
```bash
curl https://your-python-service-url.com/health
```

### 4. AI Features Test
```bash
curl https://your-backend-url.com/api/ai/features/BTC-USD
```

### 5. Edge Functions Test
```bash
# Trigger model training
curl -X POST https://your-project.supabase.co/functions/v1/model-trainer

# Trigger data fetch
curl -X POST https://your-project.supabase.co/functions/v1/historical-data-fetcher
```

## Troubleshooting

### Common Issues

**Backend won't start**
- Check environment variables
- Verify database connection
- Check port availability

**Frontend build errors**
- Verify environment variables
- Check API connectivity
- Update dependencies

**Python service failures**
- Check requirements.txt
- Verify Supabase credentials
- Check API key validity

**Edge Function timeouts**
- Increase timeout limits
- Check network connectivity
- Verify function logs

### Monitoring Logs

**Backend logs**: Render dashboard or application logs
**Frontend logs**: Vercel dashboard
**Python service logs**: Render dashboard
**Edge Function logs**: Supabase dashboard
**Database logs**: Supabase dashboard

## Scaling Considerations

### Backend Scaling
- Use load balancers
- Implement caching (Redis)
- Optimize database queries
- Consider microservices architecture

### Frontend Scaling
- Enable CDN
- Optimize bundle size
- Implement lazy loading
- Use server-side rendering

### Python Service Scaling
- Use horizontal scaling
- Implement job queues
- Optimize model loading
- Consider GPU acceleration

### Database Scaling
- Enable connection pooling
- Optimize indexes
- Consider read replicas
- Implement caching strategies

## Backup and Recovery

### Database Backups
- Enable automatic Supabase backups
- Export regular snapshots
- Test restore procedures

### Code Backups
- Use Git version control
- Tag releases
- Maintain deployment scripts

### Configuration Backups
- Store environment variables securely
- Document configuration changes
- Maintain infrastructure as code

## Security Best Practices

1. **Environment Variables**: Never commit secrets to Git
2. **API Keys**: Rotate regularly and monitor usage
3. **Database**: Use RLS policies and limit access
4. **Network**: Enable firewalls and VPN access
5. **Authentication**: Use strong passwords and 2FA
6. **Monitoring**: Set up alerts for suspicious activity

## Support

For deployment issues:
1. Check application logs
2. Verify environment configuration
3. Test individual components
4. Consult documentation
5. Contact support team

---

**Last Updated**: March 20, 2026
**Version**: 1.0.0
