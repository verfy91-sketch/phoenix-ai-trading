import express from 'express';
import { getMultiTimeframeFeatures } from '../../lib/ai/features';

const router = express.Router();

/**
 * GET /api/ai/features/:market
 * Get feature vector for a specific market
 */
router.get('/:market', async (req, res) => {
  try {
    const { market } = req.params;
    
    if (!market) {
      return res.status(400).json({ error: 'Market parameter is required' });
    }

    // Get feature vector
    const features = await getMultiTimeframeFeatures(market);
    
    if (!features) {
      return res.status(404).json({ error: 'No features available for market' });
    }

    res.json({
      market,
      features,
      featureCount: features.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting AI features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ai/features
 * Get feature vectors for multiple markets
 */
router.get('/', async (req, res) => {
  try {
    const { markets } = req.query;
    
    if (!markets) {
      return res.status(400).json({ error: 'Markets query parameter is required' });
    }

    const marketList = Array.isArray(markets) ? markets : [markets];
    const results = [];
    
    for (const market of marketList) {
      const features = await getMultiTimeframeFeatures(market as string);
      if (features) {
        results.push({
          market,
          features,
          featureCount: features.length
        });
      }
    }

    res.json({
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting AI features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
