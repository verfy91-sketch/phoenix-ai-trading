import { createClient } from '@supabase/supabase-js'

// Types
export interface Strategy {
  id: string
  source: 'tradingview' | 'quantconnect'
  source_url: string
  title: string
  author: string | null
  raw_content: string
  parsed_content?: any
  market?: string
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  fitness?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface EvolvedStrategy {
  id: string
  parent_strategy_id?: string
  name: string
  description: string
  code: string
  parameters: Record<string, any>
  performance_metrics: Record<string, any>
  generation: number
  fitness_score: number
  status: 'created' | 'testing' | 'active' | 'inactive' | 'failed'
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface StrategyApprovalRequest {
  id: string
  approved: boolean
  notes?: string
}

export class StrategyStorage {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  /**
   * Get all pending strategies
   */
  async getPendingStrategies(): Promise<Strategy[]> {
    try {
      const { data: strategies, error } = await this.supabase
        .from('absorbed_strategies')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch pending strategies: ${(error as Error).message}`)
      }

      return strategies || []

    } catch (error) {
      console.error('Get pending strategies failed:', error)
      throw error
    }
  }

  /**
   * Approve a strategy
   */
  async approveStrategy(id: string, notes?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('absorbed_strategies')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to approve strategy: ${(error as Error).message}`)
      }

      console.log(`Strategy ${id} approved`, { notes })

    } catch (error) {
      console.error('Approve strategy failed:', error)
      throw error
    }
  }

  /**
   * Reject a strategy
   */
  async rejectStrategy(id: string, reason?: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('absorbed_strategies')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to reject strategy: ${(error as Error).message}`)
      }

      console.log(`Strategy ${id} rejected`, { reason })

    } catch (error) {
      console.error('Reject strategy failed:', error)
      throw error
    }
  }

  /**
   * Get approved strategies
   */
  async getApprovedStrategies(market?: string): Promise<Strategy[]> {
    try {
      let query = this.supabase
        .from('absorbed_strategies')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (market) {
        query = query.contains('raw_content', `"market":"${market}"`)
      }

      const { data: strategies, error } = await query

      if (error) {
        throw new Error(`Failed to fetch approved strategies: ${(error as Error).message}`)
      }

      return strategies || []

    } catch (error) {
      console.error('Get approved strategies failed:', error)
      throw error
    }
  }

  /**
   * Get active evolved strategy for a market
   */
  async getActiveStrategy(market: string): Promise<EvolvedStrategy | null> {
    try {
      const { data: strategy, error } = await this.supabase
        .from('evolved_strategies')
        .select('*')
        .eq('is_active', true)
        .eq('status', 'active')
        .contains('parameters', `"market":"${market}"`)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw new Error(`Failed to fetch active strategy: ${(error as Error).message}`)
      }

      return strategy

    } catch (error) {
      console.error('Get active strategy failed:', error)
      throw error
    }
  }

  /**
   * Get evolved strategies
   */
  async getEvolvedStrategies(market?: string): Promise<EvolvedStrategy[]> {
    try {
      let query = this.supabase
        .from('evolved_strategies')
        .select('*')
        .order('fitness_score', { ascending: false })
        .order('generation', { ascending: false })

      if (market) {
        query = query.contains('parameters', `"market":"${market}"`)
      }

      const { data: strategies, error } = await query

      if (error) {
        throw new Error(`Failed to fetch evolved strategies: ${(error as Error).message}`)
      }

      return strategies || []

    } catch (error) {
      console.error('Get evolved strategies failed:', error)
      throw error
    }
  }

  /**
   * Get strategy by ID
   */
  async getStrategyById(id: string): Promise<Strategy | null> {
    try {
      const { data: strategy, error } = await this.supabase
        .from('absorbed_strategies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch strategy: ${(error as Error).message}`)
      }

      return strategy

    } catch (error) {
      console.error('Get strategy by ID failed:', error)
      throw error
    }
  }

  /**
   * Get evolved strategy by ID
   */
  async getEvolvedStrategyById(id: string): Promise<EvolvedStrategy | null> {
    try {
      const { data: strategy, error } = await this.supabase
        .from('evolved_strategies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch evolved strategy: ${(error as Error).message}`)
      }

      return strategy

    } catch (error) {
      console.error('Get evolved strategy by ID failed:', error)
      throw error
    }
  }

  /**
   * Update strategy status
   */
  async updateStrategyStatus(id: string, status: Strategy['status'], metadata?: any): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (metadata) {
        Object.assign(updateData, metadata)
      }

      const { error } = await this.supabase
        .from('absorbed_strategies')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update strategy status: ${(error as Error).message}`)
      }

    } catch (error) {
      console.error('Update strategy status failed:', error)
      throw error
    }
  }

  /**
   * Update evolved strategy
   */
  async updateEvolvedStrategy(id: string, updates: Partial<EvolvedStrategy>): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('evolved_strategies')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update evolved strategy: ${(error as Error).message}`)
      }

    } catch (error) {
      console.error('Update evolved strategy failed:', error)
      throw error
    }
  }

  /**
   * Activate evolved strategy for a market
   */
  async activateStrategy(id: string, market: string): Promise<void> {
    try {
      // Deactivate all other strategies for this market
      await this.supabase
        .from('evolved_strategies')
        .update({ 
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .contains('parameters', `"market":"${market}"`)
        .neq('id', id)

      // Activate the requested strategy
      const { error } = await this.supabase
        .from('evolved_strategies')
        .update({ 
          is_active: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to activate strategy: ${(error as Error).message}`)
      }

      console.log(`Strategy ${id} activated for market ${market}`)

    } catch (error) {
      console.error('Activate strategy failed:', error)
      throw error
    }
  }

  /**
   * Deactivate strategy
   */
  async deactivateStrategy(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('evolved_strategies')
        .update({ 
          is_active: false,
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to deactivate strategy: ${(error as Error).message}`)
      }

      console.log(`Strategy ${id} deactivated`)

    } catch (error) {
      console.error('Deactivate strategy failed:', error)
      throw error
    }
  }

  /**
   * Get strategies with pagination
   */
  async getStrategies(
    filters: {
      status?: Strategy['status']
      source?: Strategy['source']
      market?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ strategies: Strategy[], total: number }> {
    try {
      let query = this.supabase
        .from('absorbed_strategies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.source) {
        query = query.eq('source', filters.source)
      }

      if (filters.market) {
        query = query.contains('raw_content', `"market":"${filters.market}"`)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data: strategies, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch strategies: ${(error as Error).message}`)
      }

      return {
        strategies: strategies || [],
        total: count || 0
      }

    } catch (error) {
      console.error('Get strategies failed:', error)
      throw error
    }
  }

  /**
   * Get evolved strategies with pagination
   */
  async getEvolvedStrategiesPaginated(
    filters: {
      market?: string
      status?: EvolvedStrategy['status']
      is_active?: boolean
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ strategies: EvolvedStrategy[], total: number }> {
    try {
      let query = this.supabase
        .from('evolved_strategies')
        .select('*', { count: 'exact' })
        .order('fitness_score', { ascending: false })
        .order('generation', { ascending: false })

      // Apply filters
      if (filters.market) {
        query = query.contains('parameters', `"market":"${filters.market}"`)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data: strategies, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch evolved strategies: ${(error as Error).message}`)
      }

      return {
        strategies: strategies || [],
        total: count || 0
      }

    } catch (error) {
      console.error('Get evolved strategies paginated failed:', error)
      throw error
    }
  }

  /**
   * Search strategies by title or content
   */
  async searchStrategies(query: string, filters: {
    status?: Strategy['status']
    limit?: number
  } = {}): Promise<Strategy[]> {
    try {
      let dbQuery = this.supabase
        .from('absorbed_strategies')
        .select('*')
        .or(`title.ilike.%${query}%,raw_content.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (filters.status) {
        dbQuery = dbQuery.eq('status', filters.status)
      }

      if (filters.limit) {
        dbQuery = dbQuery.limit(filters.limit)
      }

      const { data: strategies, error } = await dbQuery

      if (error) {
        throw new Error(`Failed to search strategies: ${(error as Error).message}`)
      }

      return strategies || []

    } catch (error) {
      console.error('Search strategies failed:', error)
      throw error
    }
  }
}
