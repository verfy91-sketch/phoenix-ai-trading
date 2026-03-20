import { z } from 'zod';
import { databaseService } from '../../config/database';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

export class AuthService {
  async validateUser(email: string): Promise<boolean> {
    try {
      const { data: user } = await databaseService.getPublicClient()
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      return !!user;
    } catch (error) {
      logger.error('Error validating user:', error);
      return false;
    }
  }

  async getUserById(userId: string): Promise<any> {
    try {
      const user = await databaseService.getUserProfile(userId);
      return user;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw new AppError('Failed to get user', 500);
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      await databaseService.getAdminClient()
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw new AppError('Failed to update last login', 500);
    }
  }

  async changeUserRole(userId: string, newRole: string): Promise<any> {
    try {
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(newRole)) {
        throw new AppError('Invalid role', 400);
      }

      const updatedUser = await databaseService.updateUserRole(userId, newRole);
      
      logger.info('User role changed', { userId, newRole });
      return updatedUser;
    } catch (error) {
      logger.error('Error changing user role:', error);
      throw new AppError('Failed to change user role', 500);
    }
  }

  async deactivateUser(userId: string): Promise<void> {
    try {
      await databaseService.getAdminClient()
        .from('users')
        .update({ 
          is_active: false,
          deactivated_at: new Date().toISOString()
        })
        .eq('id', userId);

      logger.info('User deactivated', { userId });
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw new AppError('Failed to deactivate user', 500);
    }
  }
}

export const authService = new AuthService();
