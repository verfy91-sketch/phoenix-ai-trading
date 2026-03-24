import { Router } from 'express'
import { EnsembleModel, PredictionResult } from '../../lib/ai/ensemble'
import { RegimeDetector, MarketRegime } from '../../lib/ai/regime/detector'
import { authMiddleware, requireRole } from '../../middleware/auth.middleware'

const router = Router()
const ensembleModel = new EnsembleModel()
const regimeDetector = new RegimeDetector(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/ai/predict
 * Get AI prediction for a market
 */
router.post('/predict', authMiddleware, requireRole(['admin', 'trader']), async (req, res) => {
  try {
    const { market, timeframe = '1h', useRegime = true } = req.body

    if (!market) {
      return res.status(400).json({
        success: false,
        error: 'Market parameter is required'
      })
    }

    // Get market regime if requested
    let regime: MarketRegime | null = null
    let regimeWeight = 1.0

    if (useRegime) {
      try {
        regime = await regimeDetector.detectRegime(market, timeframe)
        
        // Adjust prediction confidence based on regime
        switch (regime.regime) {
          case 'trending':
            regimeWeight = regime.confidence * 1.2 // Boost confidence in trending markets
            break
          case 'ranging':
            regimeWeight = regime.confidence * 0.8 // Reduce confidence in ranging markets
            break
          case 'volatile':
            regimeWeight = regime.confidence * 0.9 // Slightly reduce in volatile markets
            break
          default:
            regimeWeight = regime.confidence
        }
      } catch (error) {
        console.error('Regime detection failed:', error)
        // Continue without regime adjustment
      }
    }

    // Get AI ensemble prediction
    const prediction: PredictionResult = await ensembleModel.predict(market, timeframe)

    // Adjust prediction based on regime
    const adjustedPrediction: PredictionResult = {
      ...prediction,
      confidence: prediction.confidence * regimeWeight,
      features_used: prediction.features_used + (regime ? 1 : 0), // Count regime as additional feature
      model_version: prediction.model_version + (regime ? '-regime' : ''),
      timestamp: prediction.timestamp
    }

    res.json({
      success: true,
      data: {
        prediction: adjustedPrediction,
        regime,
        market,
        timeframe,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('AI prediction failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/ai/models
 * Get available AI models
 */
router.get('/models', async (req, res) => {
  try {
    const models = await ensembleModel.getAvailableModels()
    
    res.json({
      success: true,
      data: models
    })

  } catch (error) {
    console.error('Get AI models failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * POST /api/ai/retrain
 * Trigger model retraining
 */
router.post('/retrain', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { market, force = false } = req.body

    // Call model trainer Edge Function
    const trainerResponse = await fetch(`${process.env.SUPABASE_URL}/functions/v1/model-trainer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        market,
        force,
        trigger: 'manual_api'
      })
    })

    if (!trainerResponse.ok) {
      throw new Error('Failed to trigger model training')
    }

    const result = await trainerResponse.json()

    res.json({
      success: true,
      message: 'Model training triggered successfully',
      data: result
    })

  } catch (error) {
    console.error('Model retraining failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/ai/health
 * Check AI service health
 */
router.get('/health', async (req, res) => {
  try {
    const models = await ensembleModel.getAvailableModels()
    const modelCount = models.length
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        models_loaded: modelCount,
        ensemble_ready: modelCount > 0,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('AI health check failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message,
      status: 'unhealthy'
    })
  }
})

export default router
