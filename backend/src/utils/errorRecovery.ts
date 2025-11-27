/**
 * Error Recovery Utilities
 * Provides retry logic and circuit breaker pattern for resilient operations
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests immediately
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  resetTimeout: number;        // Time in ms before attempting to close circuit
  successThreshold?: number;   // Number of successes in half-open to close circuit
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, maxDelay)));
      delay *= backoffMultiplier;
    }
  }

  throw lastError!;
}

/**
 * Create a function wrapper with retry logic
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    private operation: T,
    private options: CircuitBreakerOptions
  ) {}

  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      // Check if reset timeout has passed
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.options.resetTimeout) {
        // Transition to half-open
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        this.failureCount = 0; // Reset failure count for half-open attempt
      } else {
        throw new Error('Circuit breaker is OPEN. Service is unavailable.');
      }
    }

    try {
      const result = await this.operation(...args);
      
      // On success, update state
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      const threshold = this.options.successThreshold || 1;
      
      if (this.successCount >= threshold) {
        this.state = CircuitBreakerState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Immediately open circuit if it fails in half-open state
      this.state = CircuitBreakerState.OPEN;
      this.successCount = 0;
    } else if (
      this.state === CircuitBreakerState.CLOSED &&
      this.failureCount >= this.options.failureThreshold
    ) {
      // Open circuit after threshold failures
      this.state = CircuitBreakerState.OPEN;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
  }
}

/**
 * Create a circuit breaker wrapper for an operation
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: CircuitBreakerOptions
): CircuitBreaker<T> & T {
  const circuitBreaker = new CircuitBreaker(operation, options);

  // Create a function that uses the circuit breaker
  const wrapped = (async (...args: Parameters<T>) => {
    return circuitBreaker.execute(...args);
  }) as CircuitBreaker<T> & T;

  // Attach circuit breaker methods to the wrapped function
  (wrapped as any).getState = () => circuitBreaker.getState();
  (wrapped as any).getFailureCount = () => circuitBreaker.getFailureCount();
  (wrapped as any).reset = () => circuitBreaker.reset();

  return wrapped;
}

