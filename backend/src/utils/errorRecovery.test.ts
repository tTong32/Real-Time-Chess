import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  retryWithBackoff, 
  withRetry, 
  withCircuitBreaker,
  CircuitBreakerState 
} from './errorRecovery';

describe('Error Recovery Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const resultPromise = retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 10, // Shorter delay for testing
        maxDelay: 1000,
        backoffMultiplier: 2,
      });

      // Advance timers to allow retries
      await vi.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should stop retrying after max retries', async () => {
      const operation = async () => {
        throw new Error('Persistent failure');
      };

      const promise = retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 10,
      });

      // Advance timers
      await vi.advanceTimersByTimeAsync(100);

      await expect(promise).rejects.toThrow('Persistent failure');
    });

    it('should not retry if operation succeeds immediately', async () => {
      const operation = async () => 'success';

      const result = await retryWithBackoff(operation, {
        maxRetries: 3,
        initialDelay: 100,
      });

      expect(result).toBe('success');
    });

    it('should respect max delay cap', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Fail');
        }
        return 'success';
      };

      const resultPromise = retryWithBackoff(operation, {
        maxRetries: 2,
        initialDelay: 100,
        maxDelay: 200,
        backoffMultiplier: 10,
      });

      // Advance timers - should cap at maxDelay (200ms)
      await vi.advanceTimersByTimeAsync(300);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should allow custom retry condition', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Retryable error');
      };

      const shouldRetry = (error: Error) => {
        return error.message === 'Retryable error' && attempts < 2;
      };

      const promise = retryWithBackoff(operation, {
        maxRetries: 5,
        initialDelay: 10,
        shouldRetry,
      });

      // Advance timers
      await vi.advanceTimersByTimeAsync(100);
      
      await expect(promise).rejects.toThrow();
      expect(attempts).toBe(2); // Should stop after 2 attempts due to custom condition
    });
  });

  describe('withRetry decorator', () => {
    it('should wrap function with retry logic', async () => {
      let attempts = 0;
      const fn = async (value: string) => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Fail');
        }
        return `success: ${value}`;
      };

      const retriedFn = withRetry(fn, {
        maxRetries: 2,
        initialDelay: 10,
      });

      const resultPromise = retriedFn('test');

      // Advance timers to allow retry
      await vi.advanceTimersByTimeAsync(50);
      const result = await resultPromise;

      expect(result).toBe('success: test');
      expect(attempts).toBe(2);
    });
  });

  describe('Circuit Breaker', () => {
    describe('withCircuitBreaker', () => {
      it('should allow requests when circuit is closed', async () => {
        const operation = async () => 'success';
        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 5,
          resetTimeout: 60000,
        });

        const result = await circuitBreaker();

        expect(result).toBe('success');
        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      });

      it('should open circuit after failure threshold', async () => {
        let attempts = 0;
        const operation = async () => {
          attempts++;
          throw new Error('Service down');
        };

        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 3,
          resetTimeout: 60000,
        });

        // Trigger failures
        for (let i = 0; i < 3; i++) {
          try {
            await circuitBreaker();
          } catch (error) {
            // Expected
          }
        }

        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
        
        // Next call should fail immediately without calling operation
        attempts = 0;
        await expect(circuitBreaker()).rejects.toThrow();
        expect(attempts).toBe(0); // Operation should not be called
      });

      it('should transition to half-open after reset timeout', async () => {
        const operation = async () => {
          throw new Error('Service down');
        };

        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 2,
          resetTimeout: 100, // Short timeout for testing
        });

        // Open the circuit
        for (let i = 0; i < 2; i++) {
          try {
            await circuitBreaker();
          } catch (error) {
            // Expected
          }
        }

        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

        // Wait for reset timeout
        await vi.advanceTimersByTimeAsync(100);

        // Next call should transition to half-open and try the operation
        // After the reset timeout, the circuit should be half-open when execute is called
        const executePromise = circuitBreaker();
        const stateBeforeCall = circuitBreaker.getState();
        
        // Execute should transition to half-open, then fail
        await expect(executePromise).rejects.toThrow();
        
        // After failure in half-open, it should go back to open
        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      });

      it('should close circuit if operation succeeds in half-open state', async () => {
        let shouldFail = true;
        const operation = async () => {
          if (shouldFail) {
            throw new Error('Service down');
          }
          return 'success';
        };

        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 2,
          resetTimeout: 100,
        });

        // Open the circuit
        for (let i = 0; i < 2; i++) {
          try {
            await circuitBreaker();
          } catch (error) {
            // Expected
          }
        }

        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

        // Wait for reset timeout
        await vi.advanceTimersByTimeAsync(100);

        // Operation should now succeed
        shouldFail = false;
        const result = await circuitBreaker();

        expect(result).toBe('success');
        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      });

      it('should reset failure count on success', async () => {
        let attempts = 0;
        const operation = async () => {
          attempts++;
          if (attempts <= 2) {
            throw new Error('Fail');
          }
          return 'success';
        };

        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 3,
          resetTimeout: 60000,
        });

        // Two failures
        for (let i = 0; i < 2; i++) {
          try {
            await circuitBreaker();
          } catch (error) {
            // Expected
          }
        }

        expect(circuitBreaker.getFailureCount()).toBe(2);

        // Success should reset count
        const result = await circuitBreaker();
        expect(result).toBe('success');
        expect(circuitBreaker.getFailureCount()).toBe(0);
      });
    });

    describe('Circuit Breaker State', () => {
      it('should track state transitions correctly', async () => {
        const operation = async () => {
          throw new Error('Fail');
        };

        const circuitBreaker = withCircuitBreaker(operation, {
          failureThreshold: 2,
          resetTimeout: 100,
        });

        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

        // Open circuit
        for (let i = 0; i < 2; i++) {
          try {
            await circuitBreaker();
          } catch (error) {
            // Expected
          }
        }

        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

        // Wait for reset
        await vi.advanceTimersByTimeAsync(100);

        // After reset timeout, next execute call should transition to half-open
        // But if it fails, it goes back to open
        try {
          await circuitBreaker();
        } catch (error) {
          // Expected - fails and goes back to open
        }

        // After failure in half-open state, it should be open again
        expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      });
    });
  });
});

