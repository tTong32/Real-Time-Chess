import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { comprehensiveErrorHandler, formatUserFriendlyMessage } from './errorHandler';
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError 
} from './errors';

// Mock error logger
vi.mock('./errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
}));

describe('Comprehensive Error Handler', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      userId: 'user-123',
      get: vi.fn((header: string) => {
        if (header === 'user-agent') {
          return 'test-agent';
        }
        return undefined;
      }),
      socket: {
        remoteAddress: '127.0.0.1',
      },
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('Error Response Formatting', () => {
    it('should format ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid email format');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Invalid email format',
        message: 'Please provide a valid email address.',
        statusCode: 400,
      });
    });

    it('should format AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid token');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: expect.any(String),
        statusCode: 401,
      });
    });

    it('should format AuthorizationError with 403 status', () => {
      const error = new AuthorizationError('Insufficient permissions');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: expect.any(String),
        statusCode: 403,
      });
    });

    it('should format NotFoundError with 404 status', () => {
      const error = new NotFoundError('User not found');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'User not found',
        message: expect.any(String),
        statusCode: 404,
      });
    });

    it('should format unknown errors with 500 status and generic message', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Unexpected database error');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusSpy).toHaveBeenCalledWith(500);
      const response = jsonSpy.mock.calls[0][0];
      expect(response.statusCode).toBe(500);
      expect(response.message).toContain('unexpected error');
      // In production, error should be generic
      expect(response.error).toBe('Internal server error');

      process.env.NODE_ENV = originalEnv;
    });

    it('should include request ID in error response when available', () => {
      mockRequest = {
        ...mockRequest,
        id: 'req-123',
      };

      const error = new ValidationError('Test error');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const call = jsonSpy.mock.calls[0][0];
      expect(call).toHaveProperty('requestId', 'req-123');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with request context', async () => {
      const { errorLogger } = await import('./errorLogger');
      const error = new ValidationError('Test error');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(errorLogger.logError).toHaveBeenCalledWith(error, expect.objectContaining({
        path: '/api/test',
        method: 'GET',
        userId: 'user-123',
        ip: '127.0.0.1',
      }));
    });

    it('should not expose internal error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Database connection string: postgres://user:pass@localhost/db');

      comprehensiveErrorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      const response = jsonSpy.mock.calls[0][0];
      expect(response.error).not.toContain('connection string');
      expect(response.error).not.toContain('postgres://');
      // Should have generic error message, not the specific database details
      expect(response.statusCode).toBe(500);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('formatUserFriendlyMessage', () => {
    it('should format ValidationError messages', () => {
      const error = new ValidationError('Invalid email format');
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('valid');
      expect(message).toContain('email');
    });

    it('should format AuthenticationError messages', () => {
      const error = new AuthenticationError('Token expired');
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('session');
      expect(message).toContain('expired');
    });

    it('should format AuthorizationError messages', () => {
      const error = new AuthorizationError('Access denied');
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('permission');
      expect(message).toBeTruthy();
    });

    it('should format NotFoundError messages', () => {
      const error = new NotFoundError('User not found');
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('not found');
      expect(message).toBeTruthy();
    });

    it('should format generic errors with friendly message', () => {
      const error = new Error('Something went wrong');
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('unexpected error');
      expect(message).not.toContain('Something went wrong');
    });

    it('should handle Prisma errors gracefully', () => {
      const error = new Error('Unique constraint violation');
      error.name = 'PrismaClientKnownRequestError';
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('already exists');
      expect(message).not.toContain('Prisma');
      expect(message).not.toContain('constraint');
    });

    it('should handle database connection errors', () => {
      const error = new Error('Connection timeout');
      error.name = 'PrismaClientInitializationError';
      const message = formatUserFriendlyMessage(error);

      expect(message).toContain('database');
      expect(message).toContain('unavailable');
    });

    it('should sanitize sensitive information', () => {
      const error = new Error('Password: secret123');
      const message = formatUserFriendlyMessage(error);

      expect(message).not.toContain('secret123');
      expect(message).not.toContain('Password:');
    });
  });
});

