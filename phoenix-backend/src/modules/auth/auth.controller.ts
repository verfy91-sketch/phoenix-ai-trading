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
  async register(req: Request, res: Response): Promise<Response> {
  console.log("✅ REGISTER CONTROLLER HIT");
  
  // Force a test crash to verify error handling
  throw new Error("TEST ERROR");

  try {
    console.log("🔍 Register request received");
    console.log("� Body:", req.body);

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = hashPassword(password);
    console.log("✅ Password hashed successfully");

    console.log("🔍 Checking if user exists...");

    const { data: existingUser, error: checkError } = await databaseService.getPublicClient()
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check error:", checkError);
      return res.status(500).json({ error: checkError?.message || 'Database check error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    console.log("👤 Creating user...");

    console.log("📤 INSERT PAYLOAD:", {
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
    });

    const { data, error } = await databaseService.getAdminClient()
      .from("users")
      .insert([
        {
          email,
          password: hashedPassword,
          first_name: firstName,
          last_name: lastName,
        },
      ])
      .select()
      .single();

    console.log("📦 Insert data:", data);
    console.log("❌ Insert error:", error);

    if (error) {
      return res.status(400).json({
        error: error?.message || 'Database insert error',
        details: error,
      });
    }

    return res.json({
      success: true,
      user: data,
    });

  } catch (err: any) {
    console.error("🚨 REGISTER CRASH FULL:", err);
    console.error("🚨 MESSAGE:", err?.message);
    console.error("🚨 STACK:", err?.stack);

    return res.status(500).json({
      success: false,
      error: err?.message || "Unknown error",
      stack: err?.stack,
    });
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
