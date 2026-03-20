/**
 * Multi-Timeframe Features for Phoenix AI Trading System
 * 
 * This module provides feature extraction functions for AI models,
 * including technical indicators and alternative data integration.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface MarketData {
  timestamp: number;
  price: number;
  volume: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface TechnicalFeatures {
  price: number;
  priceChange: number;
  priceChange5: number;
  priceChange20: number;
  sma10: number;
  sma20: number;
  sma50: number;
  ema10: number;
  ema20: number;
  rsi: number;
  bbWidth: number;
  volumeRatio: number;
  volatility: number;
  pricePosition: number;
}

export interface AlternativeFeatures {
  newsSentiment: number;
  newsConfidence: number;
  articleCount: number;
  interestRate: number;
  inflationRate: number;
  gdpGrowth: number;
  unemploymentRate: number;
  socialSentiment: number;
  socialVolume: number;
  socialEngagement: number;
}

export interface MultiTimeframeFeatures {
  current: TechnicalFeatures;
  m5: TechnicalFeatures;
  m15: TechnicalFeatures;
  h1: TechnicalFeatures;
  h4: TechnicalFeatures;
  d1: TechnicalFeatures;
  alternative: AlternativeFeatures;
}

/**
 * Calculate Simple Moving Average
 */
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculate Exponential Moving Average
 */
function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  const firstSma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(firstSma);
  
  for (let i = period; i < data.length; i++) {
    const emaValue = (data[i] - result[result.length - 1]) * multiplier + result[result.length - 1];
    result.push(emaValue);
  }
  
  return result;
}

/**
 * Calculate Relative Strength Index
 */
function rsi(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
}

/**
 * Calculate Bollinger Bands
 */
function bollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
  width: number[];
} {
  const middle = sma(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const width: number[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + (std * stdDev));
    lower.push(mean - (std * stdDev));
    width.push((upper[upper.length - 1] - lower[lower.length - 1]) / mean);
  }
  
  return { upper, middle, lower, width };
}

/**
 * Calculate technical indicators for a dataset
 */
export function calculateTechnicalFeatures(data: MarketData[]): TechnicalFeatures | null {
  if (data.length < 50) return null;
  
  const prices = data.map(d => d.price);
  const volumes = data.map(d => d.volume);
  
  // Price changes
  const priceChange = prices[prices.length - 1] - prices[prices.length - 2];
  const priceChange5 = prices[prices.length - 1] - prices[prices.length - 6];
  const priceChange20 = prices[prices.length - 1] - prices[prices.length - 21];
  
  // Moving averages
  const sma10Values = sma(prices, 10);
  const sma20Values = sma(prices, 20);
  const sma50Values = sma(prices, 50);
  const ema10Values = ema(prices, 10);
  const ema20Values = ema(prices, 20);
  
  // RSI
  const rsiValues = rsi(prices);
  
  // Bollinger Bands
  const bb = bollingerBands(prices);
  
  // Volume indicators
  const volumeSma = sma(volumes, 20);
  
  // Volatility
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const volatilityReturns = returns.slice(-20);
  const volatility = volatilityReturns.reduce((a, b) => a + Math.pow(b - (volatilityReturns.reduce((c, d) => c + d, 0) / volatilityReturns.length), 2), 0) / volatilityReturns.length;
  
  const latestIndex = prices.length - 1;
  const featureIndex = Math.min(latestIndex - 20, latestIndex - 50); // Account for indicator lag
  
  return {
    price: prices[latestIndex],
    priceChange: priceChange / prices[latestIndex - 1],
    priceChange5: priceChange5 / prices[latestIndex - 6],
    priceChange20: priceChange20 / prices[latestIndex - 21],
    sma10: sma10Values[sma10Values.length - 1] / prices[latestIndex],
    sma20: sma20Values[sma20Values.length - 1] / prices[latestIndex],
    sma50: sma50Values[sma50Values.length - 1] / prices[latestIndex],
    ema10: ema10Values[ema10Values.length - 1] / prices[latestIndex],
    ema20: ema20Values[ema20Values.length - 1] / prices[latestIndex],
    rsi: rsiValues[rsiValues.length - 1] / 100,
    bbWidth: bb.width[bb.width.length - 1],
    volumeRatio: volumes[latestIndex] / volumeSma[volumeSma.length - 1],
    volatility: Math.sqrt(volatility),
    pricePosition: (prices[latestIndex] - bb.lower[bb.lower.length - 1]) / (bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1])
  };
}

/**
 * Fetch alternative data features from Supabase
 */
export async function getAlternativeFeatures(market: string): Promise<AlternativeFeatures> {
  const defaultFeatures: AlternativeFeatures = {
    newsSentiment: 0,
    newsConfidence: 0,
    articleCount: 0,
    interestRate: 0,
    inflationRate: 0,
    gdpGrowth: 0,
    unemploymentRate: 0,
    socialSentiment: 0,
    socialVolume: 0,
    socialEngagement: 0
  };
  
  try {
    // Fetch news sentiment
    const { data: newsData, error: newsError } = await supabase
      .from('news_sentiment_cache')
      .select('*')
      .eq('market', market)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (newsError) throw newsError;
    
    // Fetch economic indicators
    const { data: econData, error: econError } = await supabase
      .from('economic_indicators_cache')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (econError) throw econError;
    
    // Fetch social sentiment
    const { data: socialData, error: socialError } = await supabase
      .from('social_sentiment_cache')
      .select('*')
      .eq('market', market)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (socialError && socialError.code !== 'PGRST116') throw socialError; // PGRST116 is no rows returned
    
    // Process economic indicators (average latest 5)
    const latestEcon = econData?.slice(0, 5) || [];
    const avgInterestRate = latestEcon.reduce((sum, item) => sum + (item.interest_rate || 0), 0) / latestEcon.length;
    const avgInflationRate = latestEcon.reduce((sum, item) => sum + (item.inflation_rate || 0), 0) / latestEcon.length;
    const avgGdpGrowth = latestEcon.reduce((sum, item) => sum + (item.gdp_growth || 0), 0) / latestEcon.length;
    const avgUnemployment = latestEcon.reduce((sum, item) => sum + (item.unemployment_rate || 0), 0) / latestEcon.length;
    
    return {
      newsSentiment: newsData?.sentiment_score || 0,
      newsConfidence: newsData?.confidence || 0,
      articleCount: newsData?.article_count || 0,
      interestRate: avgInterestRate,
      inflationRate: avgInflationRate,
      gdpGrowth: avgGdpGrowth,
      unemploymentRate: avgUnemployment,
      socialSentiment: socialData?.sentiment_score || 0,
      socialVolume: socialData?.volume || 0,
      socialEngagement: socialData?.engagement || 0
    };
    
  } catch (error) {
    console.error('Error fetching alternative features:', error);
    return defaultFeatures;
  }
}

/**
 * Get multi-timeframe features for a market
 */
export async function getMultiTimeframeFeatures(market: string): Promise<number[] | null> {
  try {
    // Fetch data for different timeframes
    const timeframes = [
      { name: 'current', limit: 100 },
      { name: 'm5', limit: 100 },
      { name: 'm15', limit: 100 },
      { name: 'h1', limit: 100 },
      { name: 'h4', limit: 100 },
      { name: 'd1', limit: 100 }
    ];
    
    const features: MultiTimeframeFeatures = {
      current: {} as TechnicalFeatures,
      m5: {} as TechnicalFeatures,
      m15: {} as TechnicalFeatures,
      h1: {} as TechnicalFeatures,
      h4: {} as TechnicalFeatures,
      d1: {} as TechnicalFeatures,
      alternative: await getAlternativeFeatures(market)
    };
    
    // For now, we'll use the same data for all timeframes
    // In production, you would fetch actual multi-timeframe data
    const { data, error } = await supabase
      .from('historical_data')
      .select('*')
      .eq('market', market)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (error || !data || data.length === 0) {
      console.error('Error fetching market data:', error);
      return null;
    }
    
    // Convert to MarketData format
    const marketData: MarketData[] = data.map(row => ({
      timestamp: new Date(row.timestamp).getTime(),
      price: row.close_price,
      volume: row.volume,
      high: row.high_price,
      low: row.low_price,
      open: row.open_price
    }));
    
    // Calculate technical features
    const techFeatures = calculateTechnicalFeatures(marketData);
    if (!techFeatures) return null;
    
    // Apply same features to all timeframes (in production, calculate per timeframe)
    features.current = techFeatures;
    features.m5 = techFeatures;
    features.m15 = techFeatures;
    features.h1 = techFeatures;
    features.h4 = techFeatures;
    features.d1 = techFeatures;
    
    // Convert to feature array
    const featureArray: number[] = [];
    
    // Technical features for each timeframe
    const timeframesToProcess: (keyof Omit<MultiTimeframeFeatures, 'alternative'>)[] = [
      'current', 'm5', 'm15', 'h1', 'h4', 'd1'
    ];
    
    for (const tf of timeframesToProcess) {
      const tfFeatures = features[tf];
      featureArray.push(
        tfFeatures.price,
        tfFeatures.priceChange,
        tfFeatures.priceChange5,
        tfFeatures.priceChange20,
        tfFeatures.sma10,
        tfFeatures.sma20,
        tfFeatures.sma50,
        tfFeatures.ema10,
        tfFeatures.ema20,
        tfFeatures.rsi,
        tfFeatures.bbWidth,
        tfFeatures.volumeRatio,
        tfFeatures.volatility,
        tfFeatures.pricePosition
      );
    }
    
    // Add alternative features
    featureArray.push(
      features.alternative.newsSentiment,
      features.alternative.newsConfidence,
      features.alternative.articleCount,
      features.alternative.interestRate,
      features.alternative.inflationRate,
      features.alternative.gdpGrowth,
      features.alternative.unemploymentRate,
      features.alternative.socialSentiment,
      features.alternative.socialVolume,
      features.alternative.socialEngagement
    );
    
    return featureArray;
    
  } catch (error) {
    console.error('Error calculating multi-timeframe features:', error);
    return null;
  }
}

/**
 * Get feature count for model initialization
 */
export function getFeatureCount(): number {
  // 14 technical features * 6 timeframes + 10 alternative features
  return (14 * 6) + 10;
}
