import { Router } from 'express'
import { StrategyStorage } from '../lib/strategies/storage'
import { authMiddleware, requireRole } from '../middleware/auth.middleware'

const router = Router()
const strategyStorage = new StrategyStorage()

/**
 * GET /api/strategies/pending
 * Get all pending strategies (admin only)
 */
router.get('/pending', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const strategies = await strategyStorage.getPendingStrategies()
    res.json({
      success: true,
      data: strategies,
      count: strategies.length
    })
  } catch (error) {
    console.error('Get pending strategies failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * POST /api/strategies/:id/approve
 * Approve a strategy (admin only)
 */
router.post('/:id/approve', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    await strategyStorage.approveStrategy(id, notes)
    
    res.json({
      success: true,
      message: `Strategy ${id} approved successfully`
    })
  } catch (error) {
    console.error('Approve strategy failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * POST /api/strategies/:id/reject
 * Reject a strategy (admin only)
 */
router.post('/:id/reject', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    await strategyStorage.rejectStrategy(id, reason)
    
    res.json({
      success: true,
      message: `Strategy ${id} rejected successfully`
    })
  } catch (error) {
    console.error('Reject strategy failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/strategies/active
 * Get active strategy for a market (public)
 */
router.get('/active', async (req, res) => {
  try {
    const { market } = req.query
    
    if (!market || typeof market !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Market parameter is required'
      })
    }

    const strategy = await strategyStorage.getActiveStrategy(market)
    
    res.json({
      success: true,
      data: strategy
    })
  } catch (error) {
    console.error('Get active strategy failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/strategies
 * Get strategies with filters (public)
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      source,
      market,
      limit = 20,
      offset = 0,
      search
    } = req.query

    let strategies

    if (search && typeof search === 'string') {
      strategies = await strategyStorage.searchStrategies(search, {
        status: status as any,
        limit: parseInt(limit as string)
      })
    } else {
      const result = await strategyStorage.getStrategies({
        status: status as any,
        source: source as any,
        market: market as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      })
      strategies = result.strategies
    }

    res.json({
      success: true,
      data: strategies,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: strategies.length
      }
    })
  } catch (error) {
    console.error('Get strategies failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/strategies/evolved
 * Get evolved strategies (public)
 */
router.get('/evolved', async (req, res) => {
  try {
    const {
      market,
      status,
      is_active,
      limit = 20,
      offset = 0
    } = req.query

    const result = await strategyStorage.getEvolvedStrategiesPaginated({
      market: market as string,
      status: status as any,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    })

    res.json({
      success: true,
      data: result.strategies,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: result.total
      }
    })
  } catch (error) {
    console.error('Get evolved strategies failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * GET /api/strategies/:id
 * Get strategy by ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const strategy = await strategyStorage.getStrategyById(id)
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: 'Strategy not found'
      })
    }

    res.json({
      success: true,
      data: strategy
    })
  } catch (error) {
    console.error('Get strategy by ID failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * POST /api/strategies/:id/activate
 * Activate evolved strategy (admin only)
 */
router.post('/:id/activate', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params
    const { market } = req.body

    if (!market) {
      return res.status(400).json({
        success: false,
        error: 'Market is required'
      })
    }

    await strategyStorage.activateStrategy(id, market)
    
    res.json({
      success: true,
      message: `Strategy ${id} activated for market ${market}`
    })
  } catch (error) {
    console.error('Activate strategy failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

/**
 * POST /api/strategies/:id/deactivate
 * Deactivate strategy (admin only)
 */
router.post('/:id/deactivate', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params

    await strategyStorage.deactivateStrategy(id)
    
    res.json({
      success: true,
      message: `Strategy ${id} deactivated`
    })
  } catch (error) {
    console.error('Deactivate strategy failed:', error)
    res.status(500).json({
      success: false,
      error: (error as Error).message
    })
  }
})

export default router
