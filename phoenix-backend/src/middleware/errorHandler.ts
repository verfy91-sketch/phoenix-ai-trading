import { logger } from '../config/logger';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: any,
  req: any,
  res: any,
  next: any
): void {
  console.error("🔥 GLOBAL ERROR:", error);

  if (error instanceof AppError) {
    logger.error('Operational error:', {
      message: (error as Error).message,
      statusCode: error.statusCode,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  } else {
    logger.error('Unexpected error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });

    res.status(500).json({
      success: false,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    });
  }
}

export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
