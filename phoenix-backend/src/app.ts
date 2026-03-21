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
      origin: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://phoenix-tradingsystem.web.app"
      ],
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
    // Health check endpoint (no rate limiting)
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.app.env,
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', usersRoutes);
    this.app.use('/api/trading', tradingRoutes);
    this.app.use('/api/portfolio', portfolioRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/ai/features', aiFeaturesRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
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
    const port = config.app.port;
    
    this.server.listen(port, () => {
      logger.info(`Phoenix Backend Server started on port ${port}`, {
        environment: config.app.env,
        nodeVersion: process.version,
        port,
      });

      // Update active connections in Redis
      setInterval(async () => {
        const activeConnections = 1; // Will be updated when WebSocket is implemented
        await redisService.set('active_connections', activeConnections.toString());
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
