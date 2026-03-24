import { createClient } from '@supabase/supabase-js'
import { Database } from '../../lib/types/database'
import { gRPCClient } from '../../config/grpc.js'

// Types
export interface OrderRequest {
  symbol: string
  side: 'BUY' | 'SELL'
  type: 'MARKET' | 'LIMIT' | 'STOP'
  quantity: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
}

export interface Order extends OrderRequest {
  id: string
  user_id: string
  engine_order_id?: bigint
  status: 'PENDING' | 'SUBMITTED' | 'FILLED' | 'CANCELLED' | 'REJECTED'
  filled_quantity?: number
  filled_price?: number
  created_at: string
  updated_at: string
  filled_at?: string
  cancelled_at?: string
}

export interface Position {
  symbol: string
  quantity: number
  avg_price: number
  current_price: number
  unrealized_pnl: number
  realized_pnl: number
}

export interface Portfolio {
  user_id: string
  balance: number
  total_value: number
  positions: Position[]
  unrealized_pnl: number
  realized_pnl: number
  daily_pnl: number
}

export interface Trade {
  id: string
  user_id: string
  order_id: string
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  entry_price: number
  exit_price?: number
  pnl?: number
  fees: number
  executed_at: string
}

// Custom errors
export class InsufficientBalanceError extends Error {
  constructor(message: string = 'Insufficient balance') {
    super(message)
    this.name = 'InsufficientBalanceError'
  }
}

export class OrderNotFoundError extends Error {
  constructor(message: string = 'Order not found') {
    super(message)
    this.name = 'OrderNotFoundError'
  }
}

export class InvalidOrderError extends Error {
  constructor(message: string = 'Invalid order') {
    super(message)
    this.name = 'InvalidOrderError'
  }
}

export class TradingService {
  private supabase: any
  private grpcClient: any

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.grpcClient = new gRPCClient()
  }

  /**
   * Submit a new order
   */
  async submitOrder(userId: string, orderData: OrderRequest): Promise<Order> {
    try {
      // Validate order
      this.validateOrder(orderData)

      // Check user balance
      const portfolio = await this.getPortfolio(userId)
      const requiredBalance = orderData.quantity * (orderData.price || 0)
      
      if (orderData.side === 'BUY' && portfolio.balance < requiredBalance) {
        throw new InsufficientBalanceError(`Required: ${requiredBalance}, Available: ${portfolio.balance}`)
      }

      // Create order in database
      const { data: order, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: userId,
          symbol: orderData.symbol,
          side: orderData.side,
          type: orderData.type,
          quantity: orderData.quantity,
          price: orderData.price,
          status: 'PENDING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orderError || !order) {
        throw new Error(`Failed to create order: ${orderError?.message}`)
      }

      // Send to C++ engine via gRPC
      try {
        const engineResponse = await this.grpcClient.submitOrder({
          orderId: order.id,
          symbol: orderData.symbol,
          side: orderData.side,
          type: orderData.type,
          quantity: orderData.quantity,
          price: orderData.price,
          stopLoss: orderData.stopLoss,
          takeProfit: orderData.takeProfit
        })

        // Update order with engine response
        await this.updateOrderStatus(order.id, 'SUBMITTED', {
          engine_order_id: engineResponse.orderId
        })

        order.status = 'SUBMITTED'
        order.engine_order_id = engineResponse.orderId

      } catch (grpcError) {
        console.error('gRPC submission failed:', grpcError)
        
        // Mark as rejected if engine fails
        await this.updateOrderStatus(order.id, 'REJECTED', {
          error_message: (grpcError as Error).message
        })

        order.status = 'REJECTED'
      }

      return order

    } catch (error) {
      console.error('Order submission failed:', error)
      throw error
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(userId: string, orderId: string): Promise<void> {
    try {
      // Get order
      const order = await this.getOrderById(orderId)
      
      if (!order) {
        throw new OrderNotFoundError(`Order ${orderId} not found`)
      }

      if (order.user_id !== userId) {
        throw new Error('Unauthorized to cancel this order')
      }

      if (!['PENDING', 'SUBMITTED'].includes(order.status)) {
        throw new Error('Order cannot be cancelled')
      }

      // Send cancel to engine
      try {
        await this.grpcClient.cancelOrder({
          orderId: order.engine_order_id || orderId
        })

        // Update order status
        await this.updateOrderStatus(orderId, 'CANCELLED', {
          cancelled_at: new Date().toISOString()
        })

      } catch (grpcError) {
        console.error('gRPC cancellation failed:', grpcError)
        throw new Error(`Failed to cancel order: ${(grpcError as Error).message}`)
      }

    } catch (error) {
      console.error('Order cancellation failed:', error)
      throw error
    }
  }

  /**
   * Get orders for a user
   */
  async getOrders(
    userId: string, 
    filters: { 
      symbol?: string
      status?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<Order[]> {
    try {
      let query = this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data: orders, error } = await query

      if (error) {
        throw new Error(`Failed to fetch orders: ${(error as Error).message}`)
      }

      return orders || []

    } catch (error) {
      console.error('Get orders failed:', error)
      throw error
    }
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data: order, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        throw new Error(`Failed to fetch order: ${(error as Error).message}`)
      }

      return order

    } catch (error) {
      console.error('Get order by ID failed:', error)
      throw error
    }
  }

  /**
   * Get user portfolio
   */
  async getPortfolio(userId: string): Promise<Portfolio> {
    try {
      // Get portfolio record
      const { data: portfolioRecord, error: portfolioError } = await this.supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (portfolioError && portfolioError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch portfolio: ${(portfolioError as Error).message}`)
      }

      // Get positions
      const { data: positions, error: positionsError } = await this.supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)

      if (positionsError) {
        throw new Error(`Failed to fetch positions: ${(positionsError as Error).message}`)
      }

      // Get recent trades for P&L calculation
      const { data: trades, error: tradesError } = await this.supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('executed_at', { ascending: false })
        .limit(100)

      if (tradesError) {
        throw new Error(`Failed to fetch trades: ${(tradesError as Error).message}`)
      }

      // Calculate portfolio metrics
      const balance = portfolioRecord?.balance || 0
      const positionsList = positions || []
      
      let unrealizedPnl = 0
      let totalValue = balance

      // Calculate unrealized P&L for each position
      for (const position of positionsList) {
        const unrealized = (position.current_price - position.avg_price) * position.quantity
        position.unrealized_pnl = unrealized
        unrealizedPnl += unrealized
        totalValue += position.quantity * position.current_price
      }

      // Calculate realized P&L from trades
      let realizedPnl = 0
      let dailyPnl = 0
      const today = new Date().toISOString().split('T')[0]

      for (const trade of trades || []) {
        if (trade.pnl) {
          realizedPnl += trade.pnl
          
          // Daily P&L
          if (trade.executed_at.startsWith(today)) {
            dailyPnl += trade.pnl
          }
        }
      }

      return {
        user_id: userId,
        balance,
        total_value: totalValue + unrealizedPnl,
        positions: positionsList,
        unrealized_pnl: unrealizedPnl,
        realized_pnl: realizedPnl,
        daily_pnl: dailyPnl
      }

    } catch (error) {
      console.error('Get portfolio failed:', error)
      throw error
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    status: string, 
    fillDetails?: any
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'FILLED') {
        updateData.filled_at = new Date().toISOString()
        if (fillDetails?.filled_quantity) {
          updateData.filled_quantity = fillDetails.filled_quantity
        }
        if (fillDetails?.filled_price) {
          updateData.filled_price = fillDetails.filled_price
        }

        // Create trade record
        await this.createTradeFromOrder(orderId, fillDetails)
      }

      if (status === 'CANCELLED') {
        updateData.cancelled_at = new Date().toISOString()
      }

      if (fillDetails) {
        Object.assign(updateData, fillDetails)
      }

      const { error } = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

      if (error) {
        throw new Error(`Failed to update order status: ${(error as Error).message}`)
      }

    } catch (error) {
      console.error('Update order status failed:', error)
      throw error
    }
  }

  /**
   * Create trade record from filled order
   */
  private async createTradeFromOrder(orderId: string, fillDetails?: any): Promise<void> {
    try {
      // Get order details
      const order = await this.getOrderById(orderId)
      if (!order) return

      // Create trade record
      const { error } = await this.supabase
        .from('trades')
        .insert({
          user_id: order.user_id,
          order_id: orderId,
          symbol: order.symbol,
          side: order.side,
          quantity: fillDetails?.filled_quantity || order.quantity,
          entry_price: order.price,
          exit_price: fillDetails?.filled_price,
          pnl: this.calculatePnL(order, fillDetails),
          fees: fillDetails?.fees || 0,
          executed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to create trade record:', error)
      }

    } catch (error) {
      console.error('Create trade from order failed:', error)
    }
  }

  /**
   * Calculate P&L for a trade
   */
  private calculatePnL(order: Order, fillDetails?: any): number {
    try {
      const entryPrice = order.price || 0
      const exitPrice = fillDetails?.filled_price || entryPrice
      const quantity = fillDetails?.filled_quantity || order.quantity
      const fees = fillDetails?.fees || 0

      if (order.side === 'BUY') {
        return (exitPrice - entryPrice) * quantity - fees
      } else {
        return (entryPrice - exitPrice) * quantity - fees
      }
    } catch {
      return 0
    }
  }

  /**
   * Validate order data
   */
  private validateOrder(orderData: OrderRequest): void {
    if (!orderData.symbol || orderData.symbol.trim() === '') {
      throw new InvalidOrderError('Symbol is required')
    }

    if (!['BUY', 'SELL'].includes(orderData.side)) {
      throw new InvalidOrderError('Side must be BUY or SELL')
    }

    if (!['MARKET', 'LIMIT', 'STOP'].includes(orderData.type)) {
      throw new InvalidOrderError('Type must be MARKET, LIMIT, or STOP')
    }

    if (!orderData.quantity || orderData.quantity <= 0) {
      throw new InvalidOrderError('Quantity must be positive')
    }

    if (orderData.type === 'LIMIT' && (!orderData.price || orderData.price <= 0)) {
      throw new InvalidOrderError('Limit orders require a positive price')
    }

    if (orderData.stopLoss && orderData.stopLoss <= 0) {
      throw new InvalidOrderError('Stop loss must be positive')
    }

    if (orderData.takeProfit && orderData.takeProfit <= 0) {
      throw new InvalidOrderError('Take profit must be positive')
    }
  }

  /**
   * Get market data for symbol
   */
  async getMarketData(symbol: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('historical_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        throw new Error(`Failed to fetch market data: ${(error as Error).message}`)
      }

      return data

    } catch (error) {
      console.error('Get market data failed:', error)
      throw error
    }
  }

  /**
   * Get active positions for user
   */
  async getActivePositions(userId: string): Promise<Position[]> {
    try {
      const { data: positions, error } = await this.supabase
        .from('positions')
        .select('*')
        .eq('user_id', userId)
        .neq('quantity', 0)

      if (error) {
        throw new Error(`Failed to fetch positions: ${(error as Error).message}`)
      }

      return positions || []

    } catch (error) {
      console.error('Get active positions failed:', error)
      throw error
    }
  }
}
