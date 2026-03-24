import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MarketRegime {
  market: string
  regime: 'trending' | 'ranging' | 'volatile'
  confidence: number
  timestamp: Date
  indicators: {
    trend_strength: number
    volatility_index: number
    volume_profile: number
  }
}

interface TradingSignal {
  market: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  strategy: string
  regime: string
  timestamp: Date
}

interface Strategy {
  id: string
  name: string
  parameters: Record<string, any>
  fitness_score: number
}

class LiveTrader {
  private supabase: any

  constructor() {
    this.supabase = supabase
  }

  // Get current market regime from backend API
  private async getMarketRegime(market: string): Promise<any> {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/ai/predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          market,
          timeframe: '1h',
          useRegime: true
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to get market regime: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('Failed to get market regime from backend:', error)
      // Return default regime on error
      return {
        regime: { type: 'ranging', confidence: 0.5 }
      }
    }
  }

  // Get active strategy for market from backend API
  private async getActiveStrategy(market: string): Promise<any> {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/strategies/active?market=${market}`, {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get active strategy: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('Failed to get active strategy:', error)
      return null
    }
  }

  // Submit order via backend API
  private async submitOrderToBackend(signal: TradingSignal): Promise<void> {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/trading/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: signal.market,
          side: signal.action,
          type: 'MARKET',
          quantity: 1, // Default quantity
          // Add strategy metadata
          strategy: signal.strategy,
          regime: signal.regime
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to submit order: ${response.status}`)
      }

      const result = await response.json()
      console.log('Order submitted to backend:', result)

    } catch (error) {
      console.error('Failed to submit order to backend:', error)
    }
  }

  async executeTrading(): Promise<TradingSignal[]> {
    try {
      console.log('Starting live trading execution')
      
      // Get active strategies (using evolved strategies table)
      const { data: strategies, error: strategiesError } = await this.supabase
        .from('evolved_strategies')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')

      if (strategiesError || !strategies || strategies.length === 0) {
        console.log('No active strategies found')
        return []
      }

      const signals: TradingSignal[] = []
      const markets = ['BTC/USD', 'ETH/USD', 'SPY', 'QQQ'] // Default markets

      for (const market of markets) {
        // Get current market regime from backend API
        const regimeData = await this.getMarketRegime(market)
        const regime = regimeData?.regime || { type: 'ranging', confidence: 0.5 }
        
        // Get active strategy from backend API
        const strategy = await this.getActiveStrategy(market)
        
        if (strategy) {
          // Check if strategy is suitable for current regime
          const suitability = this.evaluateStrategyRegimeFit(strategy, regime)
          
          if (suitability > 0.6) { // Only execute if strategy fits regime well
            const signal = this.generateSignal(strategy, market, regime)
            if (signal && signal.action !== 'HOLD') {
              signals.push(signal)
              
              // Execute signal via backend API
              await this.submitOrderToBackend(signal)
            }
          }
        }
      }

      console.log(`Generated ${signals.length} trading signals`)
      return signals

    } catch (error) {
      console.error('Live trading execution failed:', error)
      return []
    }
  }

  private evaluateStrategyRegimeFit(strategy: any, regime: any): number {
    const strategyType = strategy.parameters?.type || 'general'
    const regimeType = regime.type
    
    let fitScore = 0.5 // Base fit score

    // Adjust fit score based on strategy type and regime
    switch (strategyType) {
      case 'trend_following':
        if (regimeType === 'trending') {
          fitScore = 0.9 // Excellent fit
        } else if (regimeType === 'ranging') {
          fitScore = 0.3 // Poor fit
        } else {
          fitScore = 0.6 // Moderate fit
        }
        break
        
      case 'mean_reversion':
        if (regimeType === 'ranging') {
          fitScore = 0.9 // Excellent fit
        } else if (regimeType === 'trending') {
          fitScore = 0.3 // Poor fit
        } else {
          fitScore = 0.6 // Moderate fit
        }
        break
        
      case 'volatility_trading':
        if (regimeType === 'volatile') {
          fitScore = 0.9 // Excellent fit
        } else {
          fitScore = 0.4 // Poor to moderate fit
        }
        break
        
      default:
        fitScore = 0.6 // Default moderate fit
    }

    // Adjust based on regime confidence
    return fitScore * (regime.confidence || 0.5)
  }

  private generateSignal(strategy: any, market: string, regime: any): TradingSignal | null {
    try {
      // Simple signal generation based on strategy parameters
      const params = strategy.parameters || {}
      const action = this.determineAction(params, regime)
      
      if (action === 'HOLD') {
        return null
      }

      return {
        market,
        action,
        confidence: 0.7 * (regime.confidence || 0.5),
        strategy: strategy.name,
        regime: regime.type,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Signal generation failed:', error)
      return null
    }
  }

  private determineAction(params: any, regime: any): 'BUY' | 'SELL' | 'HOLD' {
    // Simple logic for demonstration
    const strategyType = params.type || 'general'
    
    if (strategyType === 'trend_following') {
      if (regime.type === 'trending') {
        return params.trend_direction || 'BUY'
      }
    } else if (strategyType === 'mean_reversion') {
      if (regime.type === 'ranging') {
        return params.reversion_signal || 'BUY'
      }
    }
    
    return 'HOLD'
  }
}

// Main handler
serve(async (req) => {
  try {
    const trader = new LiveTrader()
    const signals = await trader.executeTrading()
    
    return new Response(
      JSON.stringify({ 
        message: 'Live trading execution completed',
        signals: signals.length,
        details: signals
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Live trader failed:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
