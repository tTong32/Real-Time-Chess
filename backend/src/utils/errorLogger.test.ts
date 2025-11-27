import { describe, it, expect, beforeEach, vi } from 'vitest';
import { errorLogger } from './errorLogger';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from './errors';

// Mock console methods
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

describe('ErrorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logError', () => {
    it('should log operational errors with appropriate level', () => {
      const error = new ValidationError('Invalid input');
      errorLogger.logError(error, { path: '/api/test', method: 'POST' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logMessage = consoleErrorSpy.mock.calls[0][1]; // Second argument is the JSON
      expect(logMessage).toContain('ValidationError');
      expect(logMessage).toContain('Invalid input');
    });

    it('should log non-operational errors as critical', () => {
      const error = new Error('Unexpected error');
      errorLogger.logError(error, { path: '/api/test', method: 'GET' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logMessage = consoleErrorSpy.mock.calls[0][1]; // Second argument is the JSON
      expect(logMessage).toBeDefined();
    });

    it('should include request context in logs', () => {
      const error = new ValidationError('Test error');
      const context = {
        path: '/api/users',
        method: 'POST',
        userId: 'user-123',
        ip: '127.0.0.1',
      };

      errorLogger.logError(error, context);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logMessage = consoleErrorSpy.mock.calls[0][1]; // Second argument is the JSON
      expect(logMessage).toContain('/api/users');
      expect(logMessage).toContain('POST');
      expect(logMessage).toContain('user-123');
    });

    it('should handle errors without stack trace gracefully', () => {
      const error = { message: 'Simple error' } as Error;
      errorLogger.logError(error, { path: '/api/test', method: 'GET' });

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log database errors with specific context', () => {
      const error = new Error('Database connection failed');
      error.name = 'PrismaClientInitializationError';
      
      errorLogger.logError(error, { path: '/api/test', method: 'GET' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logMessage = consoleErrorSpy.mock.calls[0][1]; // Second argument is the JSON
      expect(logMessage).toContain('Database');
    });
  });

  describe('shouldLogError', () => {
    it('should log all errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ValidationError('Test');
      const shouldLog = errorLogger.shouldLogError(error);

      expect(shouldLog).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should log critical errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Critical error');
      errorLogger.logError(error, { path: '/api/test', method: 'GET' });

      expect(consoleErrorSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip logging validation errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new ValidationError('Invalid input');
      errorLogger.logError(error, { path: '/api/test', method: 'POST' });

      // Validation errors should still be logged but with less detail
      expect(consoleErrorSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('formatErrorForLogging', () => {
    it('should format error with all relevant information', () => {
      const error = new ValidationError('Test error');
      const context = {
        path: '/api/test',
        method: 'POST',
        userId: 'user-123',
      };

      const formatted = errorLogger.formatErrorForLogging(error, context);

      expect(formatted).toHaveProperty('error');
      expect(formatted).toHaveProperty('context');
      expect(formatted.error).toHaveProperty('message', 'Test error');
      expect(formatted.error).toHaveProperty('name', 'ValidationError');
      expect(formatted.context).toHaveProperty('path', '/api/test');
      expect(formatted.context).toHaveProperty('method', 'POST');
    });

    it('should include stack trace for non-operational errors', () => {
      const error = new Error('Unexpected error');
      const formatted = errorLogger.formatErrorForLogging(error, {});

      expect(formatted.error).toHaveProperty('stack');
    });

    it('should handle errors without context gracefully', () => {
      const error = new ValidationError('Test');
      const formatted = errorLogger.formatErrorForLogging(error);

      expect(formatted).toHaveProperty('error');
      expect(formatted.error).toHaveProperty('message', 'Test');
    });
  });

  describe('getErrorSeverity', () => {
    it('should return ERROR for operational errors', () => {
      const error = new ValidationError('Test');
      const severity = errorLogger.getErrorSeverity(error);
      expect(severity).toBe('ERROR');
    });

    it('should return CRITICAL for non-operational errors', () => {
      const error = new Error('Unexpected');
      const severity = errorLogger.getErrorSeverity(error);
      expect(severity).toBe('CRITICAL');
    });

    it('should return WARNING for authentication errors', () => {
      const error = new AuthenticationError('Invalid token');
      const severity = errorLogger.getErrorSeverity(error);
      expect(severity).toBe('WARNING');
    });
  });
});

