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

// Check auto-training settings
async function shouldRunTraining(): Promise<boolean> {
  try {
    // Get auto-training settings
    const { data: configs } = await supabase
      .from('system_config')
      .select('key, value, type')
      .in('key', ['auto_train_enabled', 'auto_train_frequency_hours', 'auto_train_last_run']);

    if (!configs || configs.length === 0) {
      console.log('No training config found, skipping');
      return false;
    }

    const configMap = new Map(configs.map(c => [c.key, c.value]))
    
    const autoTrainEnabled = configMap.get('auto_train_enabled') === 'true'
    const frequencyHours = parseInt(configMap.get('auto_train_frequency_hours') || '168')
    const lastRun = configMap.get('auto_train_last_run');

    console.log('Training config:', {
      enabled: autoTrainEnabled,
      frequency: frequencyHours,
      lastRun
    });

    // Check if training is enabled
    if (!autoTrainEnabled) {
      console.log('Auto-training is disabled');
      return false;
    }

    // Check if enough time has passed
    if (lastRun) {
      const lastRunTime = new Date(lastRun)
      const now = new Date()
      const hoursSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastRun < frequencyHours) {
        console.log(`Training not due. Last run ${hoursSinceLastRun.toFixed(1)}h ago, frequency is ${frequencyHours}h`);
        return false;
      }
    }

    return true;

  } catch (error) {
    console.error('Error checking training settings:', error);
    return false;
  }
}

// Update last run time
async function updateLastRunTime(): Promise<void> {
  try {
    await supabase
      .from('system_config')
      .upsert({
        key: 'auto_train_last_run',
        value: new Date().toISOString(),
        type: 'timestamp',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    console.log('Updated last run time');
  } catch (error) {
    console.error('Error updating last run time:', error);
  }
}

// Trigger Python training service
async function triggerTraining(): Promise<boolean> {
  try {
    const pythonServiceUrl = await getPythonServiceUrl();
    const trainUrl = `${pythonServiceUrl}/train`;
    
    console.log(`Triggering training at: ${trainUrl}`);
    
    const response = await fetch(trainUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: 'train',
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Training service error: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log('Training triggered successfully:', result);
    return true;

  } catch (error) {
    console.error('Error triggering training:', error);
    return false;
  }
}

// Main handler
async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    console.log('Model trainer Edge Function triggered');

    // Check if training should run
    const shouldRun = await shouldRunTraining();
    if (!shouldRun) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Training not required at this time',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Trigger training
    const trainingStarted = await triggerTraining();
    if (!trainingStarted) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to trigger training',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update last run time
    await updateLastRunTime();

    return new Response(JSON.stringify({
      success: true,
      message: 'Training triggered successfully',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in model trainer:', error);
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
