import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config/environment';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initSentry() {
  if (!config.sentry.dsn) {
    console.log('Sentry DSN not provided, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    integrations: [
      // Enable HTTP request tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express integration
      new Sentry.Integrations.Express({ app: undefined }),
      // Enable profiling
      new ProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: config.sentry.environment === 'production' 
      ? config.sentry.tracesSampleRate 
      : 1.0, // 100% in development
    // Profiling
    profilesSampleRate: config.sentry.environment === 'production' 
      ? config.sentry.tracesSampleRate 
      : 1.0,
    // Release tracking
    release: process.env.npm_package_version || undefined,
    // Filter out health check endpoints
    ignoreErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
    ],
    beforeSend(event, hint) {
      // Don't send events in development unless explicitly testing
      if (config.sentry.environment === 'development' && !process.env.SENTRY_ENABLE_DEV) {
        return null;
      }
      return event;
    },
  });

  console.log('Sentry initialized');
}

/**
 * Capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('additional', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'default',
    data,
    level: 'info',
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

