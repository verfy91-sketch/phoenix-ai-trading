import { createClient } from '@supabase/supabase-js'

export interface MarketRegime {
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

export class RegimeDetector {
  private supabase: any

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async detectRegime(market: string, timeframe: string = '1h'): Promise<MarketRegime> {
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
      const prices = priceData.map((d: any) => d.close_price)
      const volumes = priceData.map((d: any) => d.volume)
      
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

      // Store regime detection result
      await this.supabase
        .from('market_regimes')
        .upsert({
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

  async getRegimeForStrategy(market: string, strategyType: string): Promise<MarketRegime> {
    const regime = await this.detectRegime(market)
    
    // Adjust regime based on strategy type
    if (strategyType === 'mean_reversion' && regime.regime === 'trending') {
      // Mean reversion strategies perform poorly in strong trends
      return {
        ...regime,
        confidence: regime.confidence * 0.7
      }
    } else if (strategyType === 'trend_following' && regime.regime === 'ranging') {
      // Trend following strategies perform poorly in ranging markets
      return {
        ...regime,
        confidence: regime.confidence * 0.7
      }
    }

    return regime
  }

  // Helper methods for technical calculations
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) return 0
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
    return sum / period
  }

  private calculateReturns(prices: number[]): number[] {
    const returns = []
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
    }
    return returns
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    return Math.sqrt(variance)
  }

  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50

    const gains = []
    const losses = []

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      if (change >= 0) {
        gains.push(change)
        losses.push(0)
      } else {
        gains.push(0)
        losses.push(Math.abs(change))
      }
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period

    if (avgLoss === 0) return 100

    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }
}
