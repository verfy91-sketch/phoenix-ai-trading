import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Python service URL from system config
async function getPythonServiceUrl(): Promise<string> {
  try {
    const { data: config } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'python_service_url')
      .single();
    
    return config?.value || 'https://phoenix-trainer.onrender.com';
  } catch (error) {
    console.error('Error getting Python service URL:', error);
    return 'https://phoenix-trainer.onrender.com';
  }
}

// Trigger Python historical data fetcher
async function triggerDataFetch(): Promise<boolean> {
  try {
    const pythonServiceUrl = await getPythonServiceUrl();
    const fetchUrl = `${pythonServiceUrl}/fetch_historical`;
    
    console.log(`Triggering historical data fetch at: ${fetchUrl}`);
    
    // Define markets to fetch
    const markets = [
      'BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'SPY', 'QQQ'
    ];
    
    const brokers = ['binance', 'oanda', 'alpaca'];
    
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: 'fetch_historical',
        markets,
        brokers,
        days: 90, // Fetch last 90 days
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Data fetch service error: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log('Historical data fetch triggered successfully:', result);
    return true;

  } catch (error) {
    console.error('Error triggering data fetch:', error);
    return false;
  }
}

// Log fetch operation to database
async function logFetchOperation(markets: string[], brokers: string[], success: boolean): Promise<void> {
  try {
    await supabase
      .from('system_logs')
      .insert({
        log_type: 'historical_data_fetch',
        message: `Historical data fetch triggered for ${markets.length} markets, ${brokers.length} brokers`,
        details: {
          markets,
          brokers,
          success,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('Error logging fetch operation:', error);
  }
}

// Main handler
async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('Historical data fetcher Edge Function triggered');

    // Define markets to fetch
    const markets = [
      'BTC/USD', 'ETH/USD', 'EUR/USD', 'GBP/USD', 'SPY', 'QQQ'
    ];
    
    const brokers = ['binance', 'oanda', 'alpaca'];

    // Trigger data fetch
    const fetchStarted = await triggerDataFetch();
    
    // Log operation
    await logFetchOperation(markets, brokers, fetchStarted);

    if (!fetchStarted) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to trigger historical data fetch',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Historical data fetch triggered successfully',
      markets: markets.length,
      brokers: brokers.length,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in historical data fetcher:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Serve the function
serve(handler, {
  port: 8000,
  hostname: '0.0.0.0'
});
