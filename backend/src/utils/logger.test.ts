import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import logger from './logger';
import winston from 'winston';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should be a Winston logger instance', () => {
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should log warn messages without throwing', () => {
    expect(() => {
      logger.warn('Test warning message');
    }).not.toThrow();
  });

  it('should log with metadata without throwing', () => {
    expect(() => {
      logger.info('Test message', { userId: '123', action: 'test' });
    }).not.toThrow();
  });

  it('should log error with Error object without throwing', () => {
    const error = new Error('Test error');
    expect(() => {
      logger.error('Error occurred', error);
    }).not.toThrow();
  });

  it('should have correct log level', () => {
    // Logger should have a level property
    expect(logger.level).toBeDefined();
    // Should be 'info' in production or 'debug' in development
    expect(['info', 'debug', 'warn', 'error']).toContain(logger.level);
  });

  it('should have transports configured', () => {
    // Logger should have transports
    expect(logger.transports).toBeDefined();
    expect(logger.transports.length).toBeGreaterThan(0);
  });

  it('should handle multiple log calls without throwing', () => {
    expect(() => {
      logger.info('Message 1');
      logger.info('Message 2');
      logger.error('Error message');
    }).not.toThrow();
  });

  it('should have default metadata', () => {
    // Logger should have defaultMeta configured
    expect(logger.defaultMeta).toBeDefined();
    expect(logger.defaultMeta).toHaveProperty('service');
  });
});

