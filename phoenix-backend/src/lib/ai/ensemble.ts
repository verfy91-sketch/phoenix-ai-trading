import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';
import { getMultiTimeframeFeatures } from './features';

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface PredictionResult {
  prediction: number; // -1, 0, 1 (SELL, HOLD, BUY)
  confidence: number; // 0-1
  features_used: number;
  model_version: string;
  timestamp: string;
}

export class EnsembleModel {
  private models: Map<string, any> = new Map();
  private modelCache: Map<string, { model: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeModels();
  }

  /**
   * Initialize models from database
   */
  private async initializeModels(): Promise<void> {
    try {
      const { data: models, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading models:', error);
        return;
      }

      for (const model of models || []) {
        this.models.set(model.market, model);
        console.log(`Loaded model for ${model.market}: ${model.model_name} (F1: ${model.f1_score})`);
      }
    } catch (error) {
      console.error('Error initializing models:', error);
    }
  }

  /**
   * Load ONNX model from URL
   */
  private async loadModel(modelUrl: string): Promise<any> {
    try {
      // Check cache first
      const cached = this.modelCache.get(modelUrl);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.model;
      }

      // Download model
      const response = await fetch(modelUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // Load ONNX model (in production, use onnxruntime)
      const ort = await import('onnxruntime-node');
      const model = await ort.InferenceSession.create(new Uint8Array(arrayBuffer));

      // Cache model
      this.modelCache.set(modelUrl, {
        model,
        timestamp: Date.now()
      });

      return model;
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  /**
   * Make prediction for a market
   */
  async predict(market: string): Promise<PredictionResult | null> {
    try {
      // Get model for market
      const modelInfo = this.models.get(market);
      if (!modelInfo) {
        console.warn(`No model found for market: ${market}`);
        return null;
      }

      // Load model
      const model = await this.loadModel(modelInfo.model_url);

      // Get features
      const features = await getMultiTimeframeFeatures(market);
      if (!features) {
        console.warn(`No features available for market: ${market}`);
        return null;
      }

      // Prepare input tensor
      const ort = await import('onnxruntime-node');
      const inputTensor = new ort.Tensor(
        new Float32Array(features),
        [1, features.length]
      );

      // Run inference
      const results = await model.run({
        float_input: inputTensor
      });

      // Get prediction
      const output = results.output;
      const predictions = Array.from(output.data) as number[];
      
      // Convert to prediction (-1, 0, 1)
      const maxIndex = predictions.indexOf(Math.max(...predictions));
      const prediction = maxIndex - 1; // Convert 0,1,2 to -1,0,1
      const confidence = Math.max(...predictions);

      return {
        prediction,
        confidence,
        features_used: features.length,
        model_version: modelInfo.model_name,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Error making prediction for ${market}:`, error);
      return null;
    }
  }

  /**
   * Batch prediction for multiple markets
   */
  async predictBatch(markets: string[]): Promise<Map<string, PredictionResult | null>> {
    const results = new Map<string, PredictionResult | null>();
    
    // Run predictions in parallel
    const promises = markets.map(async (market) => {
      const prediction = await this.predict(market);
      return { market, prediction };
    });

    const batchResults = await Promise.all(promises);
    
    for (const { market, prediction } of batchResults) {
      results.set(market, prediction);
    }

    return results;
  }

  /**
   * Refresh models from database
   */
  async refreshModels(): Promise<void> {
    console.log('Refreshing AI models...');
    await this.initializeModels();
  }

  /**
   * Get model information
   */
  getModelInfo(market: string): Database['public']['Tables']['ai_models']['Row'] | null {
    return this.models.get(market) || null;
  }

  /**
   * Get all loaded markets
   */
  getLoadedMarkets(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear();
    console.log('Model cache cleared');
  }
}

// Singleton instance
export const ensembleModel = new EnsembleModel();
