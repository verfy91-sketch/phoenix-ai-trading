import { Request, Response } from 'express';
import { databaseService } from '../../config/database';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';
import { redisService } from '../../config/redis';

export class AdminController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, offset = 0, search = '' } = req.query as any;
      
      let query = databaseService.getAdminClient()
        .from('users')
        .select('id, email, role, created_at, last_login, is_active');

      if (search) {
        query = query.ilike('email', `%${search}%`);
      }

      const { data: users } = await query
        .order('created_at', { ascending: false })
        .range(offset, limit);

      res.json({
        success: true,
        data: {
          users: users || [],
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            total: (users || []).length,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!userId || !role) {
        throw new AppError('User ID and role are required', 400);
      }

      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        throw new AppError('Invalid role', 400);
      }

      const updatedUser = await databaseService.updateUserRole(userId, role);

      logger.info('User role updated by admin', { 
        targetUserId: userId, 
        newRole: role,
        adminId: (req as any).user.userId 
      });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      throw error;
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      // Get various system statistics
      const [
        totalUsers,
        activeConnections,
        recentOrders,
        systemMetrics
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveConnections(),
        this.getRecentOrders(),
        this.getSystemMetrics(),
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeConnections,
        },
        trading: {
          recentOrders: recentOrders,
          totalOrders: systemMetrics.totalOrders || 0,
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
        timestamp: new Date().toISOString(),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      throw error;
    }
  }

  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { level = 'info', limit = 100 } = req.query as any;
      
      // In production, you would read from log files or database
      // For now, return recent log entries from Redis
      const logKey = `system_logs:${level}`;
      const logs = await redisService.get(logKey);
      
      const logEntries = logs ? JSON.parse(logs) : [];

      res.json({
        success: true,
        data: {
          level,
          logs: logEntries.slice(-parseInt(limit)),
          total: logEntries.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  private async getTotalUsers(): Promise<number> {
    try {
      const { data } = await databaseService.getAdminClient()
        .from('users')
        .select('id')
        .eq('is_active', true);

      return data?.length || 0;
    } catch (error) {
      logger.error('Error getting total users:', error);
      return 0;
    }
  }

  private async getActiveConnections(): Promise<number> {
    try {
      const connected = await redisService.get('active_connections');
      return connected ? parseInt(connected) : 0;
    } catch (error) {
      logger.error('Error getting active connections:', error);
      return 0;
    }
  }

  private async getRecentOrders(): Promise<any[]> {
    try {
      const { data } = await databaseService.getAdminClient()
        .from('orders')
        .select('symbol, side, quantity, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      return data || [];
    } catch (error) {
      logger.error('Error getting recent orders:', error);
      return [];
    }
  }

  private async getSystemMetrics(): Promise<any> {
    try {
      const metrics = await redisService.get('system_metrics');
      return metrics ? JSON.parse(metrics) : {};
    } catch (error) {
      logger.error('Error getting system metrics:', error);
      return {};
    }
  }
}

export const adminController = new AdminController();

export const getUsers = asyncHandler(adminController.getUsers.bind(adminController));
export const updateUserRole = asyncHandler(adminController.updateUserRole.bind(adminController));
export const getStats = asyncHandler(adminController.getStats.bind(adminController));
export const getLogs = asyncHandler(adminController.getLogs.bind(adminController));
