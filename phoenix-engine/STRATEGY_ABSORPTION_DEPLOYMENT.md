# Phoenix AI Trading System - Strategy Absorption Deployment Guide

## 📋 Overview
This guide covers the complete deployment of the strategy absorption system including TradingView and QuantConnect integration, Reddit removal, and regime detection integration.

---

## 🗄️ Database Migrations

### **Required SQL Files to Run in Order:**

1. **20250324_add_strategy_absorption_tables.sql**
   - Creates `absorbed_strategies` table
   - Creates `parsing_queue` table  
   - Creates `evolved_strategies` table
   - Sets up RLS policies and indexes

2. **20250324_add_trading_system_tables.sql**
   - Creates `market_regimes` table
   - Creates `trading_signals` table
   - Sets up RLS policies and indexes

3. **system_config.sql** (from engine root)
   - Updates system configuration
   - Removes Reddit references
   - Adds QuantConnect API key

---

## 🚀 Edge Functions Deployment

### **1. Strategy Absorber Function**

```bash
cd phoenix-engine
supabase functions deploy strategy-absorber
```

**Set up cron schedule in Supabase Dashboard:**
- Go to Edge Functions → strategy-absorber → Settings
- Set cron expression: `0 0 * * 0` (weekly on Sunday at midnight)

### **2. Live Trader Function**

```bash
cd phoenix-engine
supabase functions deploy live-trader
```

**Set up cron schedule:**
- Recommended: `*/5 * * * *` (every 5 minutes during trading hours)
- Or: `0 */1 * * 1-5` (every hour on weekdays)

---

## 🔧 Admin Panel Updates

### **QuantConnect API Key Configuration**

The admin panel has been updated to include:
- **QuantConnect API Key** field in the API Keys section
- Removed Reddit references from the UI
- Updated status indicators

**To configure:**
1. Go to `/admin/system` in the frontend
2. Find "QuantConnect API Key" in the API Keys section
3. Enter your QuantConnect API key
4. Click save

---

## 🗑️ Reddit Removal Checklist

### **Files to Delete (if found):**
- `phoenix-engine/python/alternative-data/reddit.py`
- `phoenix-engine/python/strategies/reddit_scraper.py`
- `phoenix-frontend/src/components/admin/RedditSettings.tsx`

### **Environment Variables to Remove:**
From Render Python service environment variables:
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`

### **Code References Removed:**
- ✅ Admin panel UI updated
- ✅ System config updated
- ✅ Python render.yaml updated
- ✅ Documentation updated

---

## 📊 Regime Detector & Live Trader Integration

### **Components Created:**

1. **Regime Detector** (`phoenix-backend/src/lib/ai/regime/detector.ts`)
   - Detects market regimes: trending, ranging, volatile
   - Calculates technical indicators
   - Stores regime history in database

2. **Live Trader** (`phoenix-engine/functions/live-trader/index.ts`)
   - Integrates with regime detector
   - Selects strategies based on regime compatibility
   - Generates and executes trading signals

### **Integration Verification:**

✅ **Regime Detection Logic:**
- Calculates moving averages for trend detection
- Volatility analysis using standard deviation
- Volume profile analysis
- Confidence scoring

✅ **Strategy Selection:**
- Trend-following strategies perform best in trending markets
- Mean-reversion strategies excel in ranging markets
- Volatility trading strategies for volatile conditions

✅ **Signal Generation:**
- Market regime consideration
- Strategy fitness score weighting
- Automatic signal logging

---

## 🔑 Environment Variables Setup

### **New Variables Required:**

**Supabase Edge Functions:**
- `SUPABASE_URL` (already set)
- `SUPABASE_SERVICE_ROLE_KEY` (already set)

**Backend (Render):**
- `QUANTCONNECT_API_KEY` (add to Render environment)

**Python Service (Render):**
- Reddit variables removed from `render.yaml`
- Existing variables maintained

---

## 📈 Testing & Verification

### **1. Strategy Absorber Test:**
```bash
# Test the function locally
cd phoenix-engine/functions/strategy-absorber
supabase functions serve strategy-absorber --no-verify-jwt

# Or test deployed function
curl -X POST "https://[your-project].supabase.co/functions/v1/strategy-absorber" \
  -H "Authorization: Bearer [your-service-role-key]"
```

### **2. Live Trader Test:**
```bash
# Test the function locally
cd phoenix-engine/functions/live-trader
supabase functions serve live-trader --no-verify-jwt

# Or test deployed function
curl -X POST "https://[your-project].supabase.co/functions/v1/live-trader" \
  -H "Authorization: Bearer [your-service-role-key]"
```

### **3. Admin Panel Test:**
1. Navigate to `/admin/system`
2. Verify QuantConnect API key field exists
3. Confirm Reddit fields are removed
4. Test API key save functionality

---

## 🚨 Important Notes

### **Rate Limiting:**
- TradingView scraper includes 2-5 second delays
- QuantConnect API respects rate limits
- Both services log rate limiting compliance

### **Error Handling:**
- Missing QuantConnect API key logs warning and skips QC
- TradingView parsing failures are logged individually
- All functions include comprehensive error logging

### **Security:**
- All tables have Row Level Security enabled
- Only admin users can access strategy data
- API keys are masked in the admin UI

---

## 📊 Monitoring

### **Logs to Monitor:**
- `system_logs` table for function execution logs
- `absorbed_strategies` table for scraping results
- `market_regimes` table for regime detection
- `trading_signals` table for signal generation

### **Key Metrics:**
- Strategies absorbed per week
- Regime detection accuracy
- Signal generation frequency
- Strategy fitness scores

---

## ✅ Deployment Checklist

- [ ] Run database migrations (2 SQL files)
- [ ] Deploy strategy-absorber Edge Function
- [ ] Deploy live-trader Edge Function
- [ ] Set up cron schedules in Supabase
- [ ] Configure QuantConnect API key in admin panel
- [ ] Remove Reddit environment variables from Render
- [ ] Test all functions
- [ ] Verify admin panel updates
- [ ] Monitor initial execution logs

---

## 🎯 Next Steps

After deployment:
1. **Monitor** the first weekly strategy absorption run
2. **Verify** regime detection accuracy
3. **Fine-tune** strategy selection parameters
4. **Scale** signal generation based on performance
5. **Add** additional strategy sources if needed

---

## 📞 Support

For issues:
1. Check Supabase function logs
2. Review system_logs table
3. Verify environment variables
4. Test API key connectivity

The system is now ready for production strategy absorption and regime-based trading!
