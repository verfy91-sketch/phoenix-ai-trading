import { Request, Response } from 'express';
import { z } from 'zod';
import { databaseService } from '../../config/database';
import { encrypt } from '../../utils/encryption';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

const apiKeySchema = z.object({
  brokerName: z.string().min(1, 'Broker name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
});

export class UsersController {
  async getApiKeys(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const apiKeys = await databaseService.getUserApiKeys(userId);

      // Decrypt API keys for display (remove sensitive data)
      const sanitizedKeys = apiKeys.map(key => ({
        id: key.id,
        broker_name: key.broker_name,
        environment: (key as any).environment || 'sandbox',
        created_at: key.created_at,
        is_active: key.is_active,
        // Don't return the actual encrypted keys
      }));

      res.json({
        success: true,
        data: sanitizedKeys,
      });
    } catch (error) {
      throw error;
    }
  }

  async addApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { brokerName, apiKey, apiSecret, environment } = apiKeySchema.parse(req.body);

      // Encrypt sensitive data
      const encryptedKey = encrypt(apiKey, process.env.ENCRYPTION_KEY!);
      const encryptedSecret = encrypt(apiSecret, process.env.ENCRYPTION_KEY!);

      const keyData = {
        user_id: userId,
        broker_name: brokerName,
        encrypted_api_key: encryptedKey.encrypted,
        encrypted_api_secret: encryptedSecret.encrypted,
        encryption_iv: encryptedKey.iv,
        encryption_tag: encryptedKey.tag,
        environment,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      const newKey = await databaseService.addUserApiKey(userId, keyData);

      logger.info('API key added', { 
        userId, 
        brokerName, 
        environment,
        keyId: newKey.id 
      });

      res.status(201).json({
        success: true,
        message: 'API key added successfully',
        data: {
          id: newKey.id,
          broker_name: newKey.broker_name,
          environment: newKey.environment,
          created_at: newKey.created_at,
          is_active: newKey.is_active,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { keyId } = req.params;

      if (!keyId) {
        throw new AppError('Key ID is required', 400);
      }

      await databaseService.deleteUserApiKey(userId, keyId);

      logger.info('API key deleted', { userId, keyId });

      res.json({
        success: true,
        message: 'API key deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  async updateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { keyId, isActive } = req.body;

      const updateData: any = {};
      if (isActive !== undefined) updateData.is_active = isActive;

      const updatedKey = await databaseService.getAdminClient()
        .from('user_api_keys')
        .update(updateData)
        .eq('user_id', userId)
        .eq('id', keyId)
        .select()
        .single();

      logger.info('API key updated', { userId, keyId, isActive });

      res.json({
        success: true,
        message: 'API key updated successfully',
        data: updatedKey,
      });
    } catch (error) {
      throw error;
    }
  }
}

export const usersController = new UsersController();

export const getApiKeys = asyncHandler(usersController.getApiKeys.bind(usersController));
export const addApiKey = asyncHandler(usersController.addApiKey.bind(usersController));
export const deleteApiKey = asyncHandler(usersController.deleteApiKey.bind(usersController));
export const updateApiKey = asyncHandler(usersController.updateApiKey.bind(usersController));
