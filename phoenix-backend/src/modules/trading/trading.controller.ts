import { Request, Response } from 'express';
import { z } from 'zod';
import { databaseService } from '../../config/database';
import { ipcClient } from '../../config/ipc';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';
import { redisService } from '../../config/redis';

const orderSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  price: z.number().positive('Price must be positive').optional(),
  quantity: z.number().positive('Quantity must be positive'),
});

export class TradingController {
  constructor() {
    // Initialize IPC connection
    this.initializeIpcConnection();
  }

  private async initializeIpcConnection(): Promise<void> {
    try {
      await ipcClient.connect();
      logger.info('Connected to Phoenix trading engine');
      
      // Set up error handling
      ipcClient.on('error', (error) => {
        logger.error('IPC connection error:', error);
      });

      ipcClient.on('maxReconnectAttemptsReached', () => {
        logger.error('Max IPC reconnection attempts reached');
      });

    } catch (error) {
      logger.error('Failed to connect to trading engine:', error);
    }
  }

  async submitOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const orderData = orderSchema.parse(req.body);

      // Submit order to engine
      const result = await ipcClient.submitOrder({
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        price: orderData.price || 0,
        quantity: orderData.quantity,
      });

      // Store order in database for history
      await databaseService.addUserOrder(userId, {
        engine_order_id: result.order_id,
        symbol: orderData.symbol,
        side: orderData.side,
        type: orderData.type,
        price: orderData.price,
        quantity: orderData.quantity,
        status: 'submitted',
      });

      logger.info('Order submitted', { 
        userId, 
        orderId: result.order_id,
        symbol: orderData.symbol,
        side: orderData.side,
      });

      res.status(201).json({
        success: true,
        message: 'Order submitted successfully',
        data: {
          orderId: result.order_id,
          symbol: orderData.symbol,
          side: orderData.side,
          type: orderData.type,
          price: orderData.price,
          quantity: orderData.quantity,
          status: 'submitted',
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const orders = await databaseService.getUserOrders(userId);

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      throw error;
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID is required', 400);
      }

      // Cancel order via IPC
      const result = await ipcClient.cancelOrder(parseInt(orderId));

      // Update order status in database
      await databaseService.getAdminClient()
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('engine_order_id', orderId);

      logger.info('Order cancelled', { userId, orderId });

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: result,
      });
    } catch (error) {
      throw error;
    }
  }

  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;

      // Try to get from cache first
      let portfolio = await redisService.getCachedPortfolioSnapshot(userId);
      
      if (!portfolio) {
        // Get from engine via IPC
        portfolio = await ipcClient.getPortfolio();
        
        // Cache for 10 seconds
        await redisService.cachePortfolioSnapshot(userId, portfolio);
      }

      res.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      throw error;
    }
  }

  async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      // Calculate performance metrics from order history
      const orders = await databaseService.getUserOrders(userId);
      const completedOrders = orders.filter(order => order.status === 'filled');
      
      // Simple performance calculation
      const totalTrades = completedOrders.length;
      const winningTrades = completedOrders.filter(order => 
        order.side === 'BUY' ? order.exit_price > order.entry_price :
                           order.exit_price < order.entry_price
      ).length;
      
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      // Calculate P&L (simplified)
      const totalPnL = completedOrders.reduce((sum, order) => {
        const pnl = order.side === 'BUY' ? 
          (order.exit_price - order.entry_price) * order.quantity :
          (order.entry_price - order.exit_price) * order.quantity;
        return sum + pnl;
      }, 0);

      const performance = {
        totalTrades,
        winningTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnL,
        averagePnL: totalTrades > 0 ? totalPnL / totalTrades : 0,
      };

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      throw error;
    }
  }
}

export const tradingController = new TradingController();

export const submitOrder = asyncHandler(tradingController.submitOrder.bind(tradingController));
export const getOrders = asyncHandler(tradingController.getOrders.bind(tradingController));
export const cancelOrder = asyncHandler(tradingController.cancelOrder.bind(tradingController));
export const getPortfolio = asyncHandler(tradingController.getPortfolio.bind(tradingController));
export const getPerformance = asyncHandler(tradingController.getPerformance.bind(tradingController));
