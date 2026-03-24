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

class LiveTrader {
  private supabase: any

  constructor() {
    this.supabase = supabase
  }

  async executeTrading(): Promise<TradingSignal[]> {
    try {
      console.log('Starting live trading execution')
      
      // Get active strategies
      const { data: strategies, error: strategiesError } = await this.supabase
        .from('evolved_strategies')
        .select('*')
        .eq('status', 'active')
        .order('fitness_score', { ascending: false })
        .limit(10)

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
          const suitability = await this.evaluateStrategyRegimeFit(strategy, regime)
          
          if (suitability > 0.6) { // Only execute if strategy fits regime well
            const signal = await this.generateSignal(strategy, market, regime)
            if (signal) {
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

  private async detectRegime(market: string): Promise<MarketRegime> {
    try {
      // Get recent price data
      const { data: priceData, error } = await this.supabase
        .from('historical_data')
        .select('*')
        .eq('market', market)
        .order('timestamp', { ascending: false })
        .limit(100)

      if (error || !priceData || priceData.length < 20) {
        throw new Error('Insufficient data for regime detection')
      }

      // Calculate technical indicators
      const prices = priceData.map(d => d.close_price)
      const volumes = priceData.map(d => d.volume)
      
      // Trend detection using moving averages
      const shortMA = this.calculateMA(prices.slice(-20), 10)
      const longMA = this.calculateMA(prices.slice(-50), 20)
      const trendStrength = Math.abs(shortMA - longMA) / longMA

      // Volatility calculation
      const returns = this.calculateReturns(prices)
      const volatility = this.calculateVolatility(returns)
      const volatilityIndex = Math.min(volatility / 0.02, 1) // Normalize to 0-1

      // Volume analysis
      const avgVolume = this.calculateMA(volumes, 20)
      const currentVolume = volumes[volumes.length - 1]
      const volumeProfile = currentVolume / avgVolume

      // Determine regime
      let regime: 'trending' | 'ranging' | 'volatile'
      let confidence: number

      if (volatilityIndex > 0.7) {
        regime = 'volatile'
        confidence = volatilityIndex
      } else if (trendStrength > 0.02) {
        regime = 'trending'
        confidence = Math.min(trendStrength * 20, 1)
      } else {
        regime = 'ranging'
        confidence = 1 - (trendStrength * 20 + volatilityIndex) / 2
      }

      const result: MarketRegime = {
        market,
        regime,
        confidence: Math.max(0.3, Math.min(confidence, 1)),
        timestamp: new Date(),
        indicators: {
          trend_strength: trendStrength,
          volatility_index: volatilityIndex,
          volume_profile: volumeProfile
        }
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
          market,
          regime,
          confidence,
          indicators: result.indicators,
          timestamp: result.timestamp
        })

      return result

    } catch (error) {
      console.error('Regime detection failed:', error)
      // Return default regime on error
      return {
        market,
        regime: 'ranging',
        confidence: 0.5,
        timestamp: new Date(),
        indicators: {
          trend_strength: 0,
          volatility_index: 0.5,
          volume_profile: 1
        }
      }
    }
  }

  private async evaluateStrategyRegimeFit(strategy: any, regime: MarketRegime): Promise<number> {
    // Get strategy parameters
    const params = strategy.parameters || {}
    const strategyType = params.type || 'general'
    
    let fitScore = 0.5 // Base fit score

    // Adjust fit score based on strategy type and current regime
    switch (strategyType) {
      case 'trend_following':
        if (regime.regime === 'trending') {
          fitScore = 0.9 * regime.confidence
        } else if (regime.regime === 'volatile') {
          fitScore = 0.6 * regime.confidence
        } else {
          fitScore = 0.3 * regime.confidence
        }
        break
        
      case 'mean_reversion':
        if (regime.regime === 'ranging') {
          fitScore = 0.9 * regime.confidence
        } else if (regime.regime === 'volatile') {
          fitScore = 0.7 * regime.confidence
        } else {
          fitScore = 0.2 * regime.confidence
        }
        break
        
      case 'volatility_trading':
        if (regime.regime === 'volatile') {
          fitScore = 0.9 * regime.confidence
        } else {
          fitScore = 0.4 * regime.confidence
        }
        break
        
      default:
        fitScore = 0.6 * regime.confidence
    }

    // Adjust based on strategy fitness score
    const strategyFitness = strategy.fitness_score || 0.5
    return fitScore * (0.5 + strategyFitness * 0.5)
  }

  private async generateSignal(strategy: any, market: string, regime: MarketRegime): Promise<TradingSignal | null> {
    try {
      // Get latest market data
      const { data: latestData } = await this.supabase
        .from('historical_data')
        .select('*')
        .eq('market', market)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (!latestData) return null

      // Simple signal generation based on strategy parameters
      const params = strategy.parameters || {}
      const action = this.determineAction(params, latestData, regime)
      
      if (action === 'HOLD') return null

      return {
        market,
        action,
        confidence: regime.confidence * (strategy.fitness_score || 0.5),
        strategy: strategy.name,
        regime: regime.regime,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Signal generation failed:', error)
      return null
    }
  }

  private determineAction(params: any, marketData: any, regime: MarketRegime): 'BUY' | 'SELL' | 'HOLD' {
    // Simple logic for demonstration - in production, this would use the actual strategy code
    const rsi = this.calculateRSI(marketData.close_price, 14) // Simplified
    const movingAvg = this.calculateMA([marketData.close_price], 20) // Simplified
    
    if (params.type === 'trend_following') {
      if (marketData.close_price > movingAvg && regime.regime === 'trending') {
        return 'BUY'
      } else if (marketData.close_price < movingAvg && regime.regime === 'trending') {
        return 'SELL'
      }
    } else if (params.type === 'mean_reversion') {
      if (rsi < 30 && regime.regime === 'ranging') {
        return 'BUY'
      } else if (rsi > 70 && regime.regime === 'ranging') {
        return 'SELL'
      }
    }

    return 'HOLD'
  }

  private async executeSignal(signal: TradingSignal): Promise<void> {
    try {
      // Log the signal for now - in production, this would execute via broker API
      await this.supabase
        .from('trading_signals')
        .insert({
          market: signal.market,
          action: signal.action,
          confidence: signal.confidence,
          strategy: signal.strategy,
          regime: signal.regime,
          timestamp: signal.timestamp,
          status: 'generated'
        })

      console.log(`Signal generated: ${signal.action} ${signal.market} via ${signal.strategy}`)
      
    } catch (error) {
      console.error('Signal execution failed:', error)
    }
  }

  // Helper methods (simplified)
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0
    const slice = prices.slice(-period)
    return slice.reduce((sum, price) => sum + price, 0) / period
  }

  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }

  private calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    return Math.sqrt(variance) * Math.sqrt(252)
  }

  private calculateRSI(price: number, period: number): number {
    // Simplified RSI calculation
    return 50 + Math.random() * 40 - 20 // Placeholder
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
