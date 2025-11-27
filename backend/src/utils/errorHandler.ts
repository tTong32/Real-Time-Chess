import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from './errors';
import { errorLogger } from './errorLogger';

/**
 * Format user-friendly error messages
 */
export function formatUserFriendlyMessage(error: Error): string {
  // Handle known error types
  if (error instanceof ValidationError) {
    // Make validation errors more user-friendly
    const message = error.message.toLowerCase();
    if (message.includes('email')) {
      return 'Please provide a valid email address.';
    }
    if (message.includes('password')) {
      return 'Password does not meet requirements.';
    }
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    if (error.message.toLowerCase().includes('token')) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.message.toLowerCase().includes('expired')) {
      return 'Your session has expired. Please log in again.';
    }
    return 'Authentication failed. Please check your credentials.';
  }

  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.';
  }

  if (error instanceof NotFoundError) {
    if (error.message.toLowerCase().includes('user')) {
      return 'User not found.';
    }
    if (error.message.toLowerCase().includes('game')) {
      return 'Game not found.';
    }
    return 'The requested resource could not be found.';
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const message = error.message.toLowerCase();
    if (message.includes('unique constraint') || message.includes('duplicate')) {
      return 'This record already exists.';
    }
    if (message.includes('foreign key constraint')) {
      return 'Invalid reference to related data.';
    }
    if (message.includes('record not found')) {
      return 'The requested record could not be found.';
    }
  }

  if (error.name === 'PrismaClientInitializationError') {
    return 'The database is temporarily unavailable. Please try again later.';
  }

  if (error.name === 'PrismaClientValidationError') {
    return 'Invalid data provided. Please check your input.';
  }

  // Handle database connection errors
  if (error.message.toLowerCase().includes('connection') || 
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('econnrefused')) {
    return 'The database is temporarily unavailable. Please try again later.';
  }

  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
}

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(error: Error, message: string): string {
  // In development, show full error message
  if (process.env.NODE_ENV === 'development') {
    return message;
  }

  // In production, hide sensitive information
  const sensitivePatterns = [
    /password:?\s*[^\s]+/gi,
    /token:?\s*[^\s]+/gi,
    /secret:?\s*[^\s]+/gi,
    /connection string:?\s*[^\s]+/gi,
    /postgres:\/\/[^\s]+/gi,
    /mongodb:\/\/[^\s]+/gi,
  ];

  let sanitized = message;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });

  return sanitized;
}

/**
 * Comprehensive error handler middleware
 * Handles all errors with proper logging and user-friendly messages
 */
export function comprehensiveErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract request context
  const context = {
    path: req.path,
    method: req.method,
    userId: (req as any).userId,
    ip: req.ip || (req.socket && req.socket.remoteAddress) || undefined,
    headers: {
      'user-agent': req.get ? req.get('user-agent') : undefined,
    },
  };

  // Log the error
  errorLogger.logError(error, context);

  // Determine status code
  let statusCode = 500;
  let errorMessage = error.message;
  let userFriendlyMessage = formatUserFriendlyMessage(error);

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorMessage = error.message;
  }

  // In production, hide internal error details for unknown errors
  if (process.env.NODE_ENV === 'production' && !(error instanceof AppError)) {
    errorMessage = 'Internal server error';
  }

  // Sanitize error message for production (remove sensitive data)
  errorMessage = sanitizeErrorMessage(error, errorMessage);
  userFriendlyMessage = sanitizeErrorMessage(error, userFriendlyMessage);

  // Build error response
  const errorResponse: any = {
    error: errorMessage,
    message: userFriendlyMessage,
    statusCode,
  };

  // Add request ID if available
  if ((req as any).id) {
    errorResponse.requestId = (req as any).id;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Enhanced async handler wrapper
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Re-export for backward compatibility
export { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from './errors';

