import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import configuration
import { config } from './config/env';
import { logger } from './config/logger';
import { redisService } from './config/redis';
import { databaseService } from './config/database';
import { validateEnvironment } from './utils/envValidation';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import tradingRoutes from './modules/trading/trading.routes';
import portfolioRoutes from './modules/portfolio/portfolio.routes';
import adminRoutes from './modules/admin/admin.routes';
import aiFeaturesRoutes from './routes/ai/features';
import strategiesRoutes from './routes/strategies';
import aiPredictRoutes from './routes/ai/predict';

// Load environment variables
dotenv.config();

// Validate environment before starting
validateEnvironment();

class App {
  public app: express.Application;
  public server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.createHttpServer();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: true,
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Route-level logging - see ALL incoming requests
    this.app.use((req, res, next) => {
      console.log("🌐 INCOMING:", req.method, req.url);
      next();
    });

    // Health check endpoint (no rate limiting)
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.app.env,
      });
    });

    // Database test endpoint
    this.app.get('/db-test', async (req, res) => {
      console.log("🔍 DB TEST START");

      try {
        console.log("🔍 Testing Supabase connection...");
        
        // Test basic database connection using Supabase
        const { data, error } = await databaseService.getPublicClient()
          .from('users')
          .select('*')
          .limit(1);
        
        console.log("📊 DB test result:", { data, error });

        if (error) {
          console.error('❌ Database test error:', error);
          res.status(500).json({ 
            ok: false, 
            error: error.message,
            details: error,
            code: 'SUPABASE_ERROR'
          });
          return;
        }

        console.log("✅ Database connection successful");
        res.json({ 
          ok: true, 
          result: data,
          message: "Database connection successful",
          code: 'SUCCESS'
        });

      } catch (err: any) {
        console.error('❌ DB ERROR:', err);
        console.error('❌ Error stack:', err.stack);

        // Don't crash - return proper error response
        res.status(500).json({
          ok: false,
          error: err.message || "Database error",
          stack: err.stack,
          code: 'DATABASE_EXCEPTION'
        });
      }
    });

    // API routes
    this.app.use('/auth', authRoutes);  // For frontend compatibility
    this.app.use('/api/auth', authRoutes);  // For API calls
    this.app.use('/api/users', usersRoutes);
    this.app.use('/api/trading', tradingRoutes);
    this.app.use('/api/portfolio', portfolioRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/ai/features', aiFeaturesRoutes);
    this.app.use('/api/strategies', strategiesRoutes);
    this.app.use('/api/ai', aiPredictRoutes);

    // 404 handler with logging
    this.app.use('*', (req, res) => {
      console.log("❌ NO ROUTE MATCHED:", req.method, req.url);
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private createHttpServer(): void {
    this.server = createServer(this.app);
  }

  public async start(): Promise<void> {
    const PORT = process.env.PORT;

    console.log("🔍 ENV PORT:", process.env.PORT);

    if (!PORT) {
      throw new Error("PORT environment variable is required");
    }
    
    this.server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      logger.info(`Phoenix Backend Server started on port ${PORT}`, {
        environment: config.app.env,
        nodeVersion: process.version,
        port: PORT,
      });

      // Update active connections in Redis (non-fatal)
      setInterval(async () => {
        try {
          if (redisService.isAvailable()) {
            const activeConnections = 1; // Will be updated when WebSocket is implemented
            await redisService.set('active_connections', activeConnections.toString());
          }
        } catch (error) {
          console.warn('Redis update error (non-fatal):', error);
        }
      }, 30000); // Every 30 seconds
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down Phoenix Backend Server');

    // Close database connections
    await redisService.disconnect();

    // Close HTTP server
    this.server.close(() => {
      logger.info('Phoenix Backend Server stopped');
      process.exit(0);
    });
  }
}

export default App;
