import { AppError } from './errors';

export interface ErrorContext {
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
  [key: string]: any;
}

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface FormattedError {
  error: {
    name: string;
    message: string;
    stack?: string;
    statusCode?: number;
  };
  context?: ErrorContext;
  severity: ErrorSeverity;
  timestamp: string;
}

/**
 * Error Logger - Handles structured error logging
 */
class ErrorLogger {
  /**
   * Log an error with context
   */
  logError(error: Error, context: ErrorContext = {}): void {
    if (!this.shouldLogError(error)) {
      return;
    }

    const formatted = this.formatErrorForLogging(error, context);
    const severity = this.getErrorSeverity(error);

    // Log based on severity
    const logMessage = JSON.stringify(formatted, null, 2);
    switch (severity) {
      case 'CRITICAL':
        console.error('[CRITICAL]', logMessage);
        break;
      case 'ERROR':
        console.error('[ERROR]', logMessage);
        break;
      case 'WARNING':
        console.warn('[WARNING]', logMessage);
        break;
      case 'INFO':
        console.info('[INFO]', logMessage);
        break;
    }
  }

  /**
   * Determine if error should be logged based on environment
   */
  shouldLogError(error: Error): boolean {
    // Always log in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    // In production, log all errors but with different verbosity
    // Operational errors (validation, auth) are less critical
    if (error instanceof AppError && error.isOperational) {
      // Still log but with less detail
      return true;
    }

    // Always log non-operational errors (critical)
    return true;
  }

  /**
   * Format error for structured logging
   */
  formatErrorForLogging(error: Error, context: ErrorContext = {}): FormattedError {
    // Get the error name from constructor if available
    const errorName = error.constructor?.name || error.name || 'Error';
    
    const formatted: FormattedError = {
      error: {
        name: errorName,
        message: error.message,
      },
      severity: this.getErrorSeverity(error),
      timestamp: new Date().toISOString(),
    };

    // Add stack trace for non-operational errors or in development
    if (!(error instanceof AppError) || process.env.NODE_ENV === 'development') {
      formatted.error.stack = error.stack;
    }

    // Add status code if it's an AppError
    if (error instanceof AppError) {
      formatted.error.statusCode = error.statusCode;
    }

    // Add context if provided
    if (Object.keys(context).length > 0) {
      formatted.context = this.sanitizeContext(context);
    }

    // Add database-specific context for Prisma errors
    if (error.name?.includes('Prisma')) {
      formatted.context = {
        ...formatted.context,
        ...context,
        errorType: 'Database',
      };
    }

    return formatted;
  }

  /**
   * Get error severity level
   */
  getErrorSeverity(error: Error): ErrorSeverity {
    if (error instanceof AppError) {
      // Authentication errors are warnings (expected in some cases)
      if (error.statusCode === 401) {
        return 'WARNING';
      }
      // Other operational errors are regular errors
      return 'ERROR';
    }

    // Non-operational errors are critical
    return 'CRITICAL';
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization'];
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        delete sanitized[key];
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

