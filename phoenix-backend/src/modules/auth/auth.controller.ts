import { Request, Response } from 'express';
import { z } from 'zod';
import { databaseService } from '../../config/database';
import { generateToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/encryption';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { validateRequest } from '../../middleware/validator';
import { logger } from '../../config/logger';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await databaseService.getPublicClient()
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser.data) {
        throw new AppError('User with this email already exists', 409);
      }

      // Hash password
      const hashedPassword = hashPassword(password);

      // Create user
      const { data: user, error } = await databaseService.getAdminClient()
        .from('users')
        .insert({
          email,
          password: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role: 'user',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error during user creation:', error);
        throw new AppError(`Failed to create user: ${error.message}`, 500);
      }

      logger.info('User registered successfully', { userId: user.id, email });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle other errors with detailed logging
      if (error instanceof Error) {
        console.error('Registration failed with error:', {
          message: error.message,
          stack: error.stack,
          body: req.body
        });
        res.status(500).json({ 
          error: error.message,
          type: 'RegistrationError',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Unknown registration error:', error);
        res.status(500).json({ 
          error: 'Unknown registration error occurred',
          type: 'UnknownError',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Get user from database
      const { data: user } = await databaseService.getPublicClient()
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!user || !verifyPassword(password, user.password)) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last login
      await databaseService.getAdminClient()
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Generate JWT
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.info('User logged in successfully', { userId: user.id, email });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
          },
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a stateless JWT setup, logout is handled client-side
      // But we can log the activity and potentially invalidate tokens if needed
      
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      throw error;
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // For now, return a simple success response
      // In production, you might implement token refresh logic
      res.json({
        success: true,
        message: 'Token refresh endpoint',
      });
    } catch (error) {
      throw error;
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const user = await databaseService.getUserProfile(userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.userId;
      const { firstName, lastName } = req.body;

      const updateData: any = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;

      const updatedUser = await databaseService.updateUserProfile(userId, updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      throw error;
    }
  }
}

export const authController = new AuthController();

export const register = asyncHandler(authController.register.bind(authController));
export const login = asyncHandler(authController.login.bind(authController));
export const logout = asyncHandler(authController.logout.bind(authController));
export const refreshToken = asyncHandler(authController.refreshToken.bind(authController));
export const getMe = asyncHandler(authController.getMe.bind(authController));
export const updateMe = asyncHandler(authController.updateMe.bind(authController));
