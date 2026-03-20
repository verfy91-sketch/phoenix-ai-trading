import { Request, Response } from 'express';
import { databaseService } from '../../config/database';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

export class PortfolioController {
  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      // Get portfolio from database with positions
      const { data: portfolio } = await databaseService.getPublicClient()
        .from('portfolios')
        .select(`
          *,
          positions (
            symbol,
            quantity,
            avg_price,
            current_price,
            unrealized_pnl,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!portfolio) {
        // Return empty portfolio if none exists
        res.json({
          success: true,
          data: {
            balance: 0,
            total_value: 0,
            positions: [],
            unrealized_pnl: 0,
            realized_pnl: 0,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: portfolio,
      });
    } catch (error) {
      throw error;
    }
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { limit = 100, offset = 0 } = req.query as any;

      const { data: trades } = await databaseService.getPublicClient()
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('executed_at', { ascending: false })
        .range(offset, limit);

      const tradesData = trades || [];

      res.json({
        success: true,
        data: {
          trades: tradesData,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: tradesData.length === parseInt(limit),
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      
      // Get performance metrics from database
      const { data: performance } = await databaseService.getPublicClient()
        .from('portfolio_performance')
        .select('*')
        .eq('user_id', userId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single();

      // If no cached performance, calculate it
      if (!performance) {
        const { data: trades } = await databaseService.getPublicClient()
          .from('trades')
          .select('pnl, executed_at')
          .eq('user_id', userId)
          .order('executed_at', { ascending: false });

        const tradesData = trades || [];
        const totalTrades = tradesData.length;
        const totalPnL = tradesData.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0);
        const winningTrades = tradesData.filter((trade: any) => (trade.pnl || 0) > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const performanceData = {
          user_id: userId,
          total_trades: totalTrades,
          winning_trades: winningTrades,
          win_rate: winRate,
          total_pnl: totalPnL,
          sharpe_ratio: 0, // Would need more complex calculation
          max_drawdown: 0, // Would need more complex calculation
          calculated_at: new Date().toISOString(),
        };

        // Cache the performance calculation
        await databaseService.getAdminClient()
          .from('portfolio_performance')
          .upsert([performanceData]);

        res.json({
          success: true,
          data: performanceData,
        });
      } else {
        res.json({
          success: true,
          data: performance,
        });
      }
    } catch (error) {
      throw error;
    }
  }
}

export const portfolioController = new PortfolioController();

export const getPortfolio = asyncHandler(portfolioController.getPortfolio.bind(portfolioController));
export const getHistory = asyncHandler(portfolioController.getHistory.bind(portfolioController));
export const getPerformance = asyncHandler(portfolioController.getPerformance.bind(portfolioController));
