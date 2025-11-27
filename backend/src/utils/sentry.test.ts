import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Mock Sentry
vi.mock('@sentry/node', () => {
  const mockSetContext = vi.fn();
  const mockCaptureException = vi.fn();
  const mockCaptureMessage = vi.fn();
  const mockAddBreadcrumb = vi.fn();
  const mockSetUser = vi.fn();
  const mockInit = vi.fn();

  return {
    default: {
      init: mockInit,
      captureException: mockCaptureException,
      captureMessage: mockCaptureMessage,
      addBreadcrumb: mockAddBreadcrumb,
      setUser: mockSetUser,
      setContext: mockSetContext,
    },
    init: mockInit,
    captureException: mockCaptureException,
    captureMessage: mockCaptureMessage,
    addBreadcrumb: mockAddBreadcrumb,
    setUser: mockSetUser,
    setContext: mockSetContext,
    Integrations: {
      Http: vi.fn().mockImplementation(() => ({})),
      Express: vi.fn().mockImplementation(() => ({})),
    },
    Handlers: {
      requestHandler: vi.fn(() => (req: any, res: any, next: any) => next()),
      tracingHandler: vi.fn(() => (req: any, res: any, next: any) => next()),
      errorHandler: vi.fn(() => (err: any, req: any, res: any, next: any) => next(err)),
    },
  };
});

vi.mock('@sentry/profiling-node', () => ({
  ProfilingIntegration: vi.fn().mockImplementation(() => ({})),
}));

// Mock config - will be updated per test
const mockConfig = {
  sentry: {
    dsn: '',
    environment: 'test',
    tracesSampleRate: 0.1,
  },
};

vi.mock('../config/environment', () => ({
  config: mockConfig,
}));

describe('Sentry Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset mock config
    mockConfig.sentry.dsn = '';
    mockConfig.sentry.environment = 'test';
    mockConfig.sentry.tracesSampleRate = 0.1;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('initSentry', () => {
    it('should initialize Sentry when DSN is provided', async () => {
      mockConfig.sentry.dsn = 'https://test@sentry.io/123';
      mockConfig.sentry.environment = 'test';
      
      vi.resetModules();
      const { initSentry } = await import('./sentry');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      initSentry();
      
      expect(Sentry.init).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should skip initialization when DSN is not provided', async () => {
      mockConfig.sentry.dsn = '';
      mockConfig.sentry.environment = 'test';
      
      vi.resetModules();
      const { initSentry } = await import('./sentry');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      initSentry();
      
      expect(Sentry.init).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Sentry DSN not provided, skipping Sentry initialization'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('captureException', () => {
    it('should capture exception with context', async () => {
      const { captureException } = await import('./sentry');
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      
      captureException(error, context);
      
      expect(Sentry.setContext).toHaveBeenCalledWith('additional', context);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture exception without context', async () => {
      const { captureException } = await import('./sentry');
      const error = new Error('Test error');
      
      captureException(error);
      
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('captureMessage', () => {
    it('should capture message with default level', async () => {
      const { captureMessage } = await import('./sentry');
      captureMessage('Test message');
      
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
    });

    it('should capture message with custom level', async () => {
      const { captureMessage } = await import('./sentry');
      captureMessage('Error message', 'error');
      
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Error message', 'error');
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with message', async () => {
      const { addBreadcrumb } = await import('./sentry');
      addBreadcrumb('User action', 'user', { userId: '123' });
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'User action',
        category: 'user',
        data: { userId: '123' },
        level: 'info',
      });
    });

    it('should use default category when not provided', async () => {
      const { addBreadcrumb } = await import('./sentry');
      addBreadcrumb('Test message');
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'default',
        })
      );
    });
  });

  describe('setUser', () => {
    it('should set user context', async () => {
      const { setUser } = await import('./sentry');
      const user = { id: '123', email: 'test@example.com', username: 'testuser' };
      
      setUser(user);
      
      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
      });
    });
  });

  describe('clearUser', () => {
    it('should clear user context', async () => {
      const { clearUser } = await import('./sentry');
      clearUser();
      
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });
});

