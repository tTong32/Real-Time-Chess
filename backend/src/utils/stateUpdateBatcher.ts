/**
 * State Update Batcher - Batches game state updates to reduce Socket.IO emissions
 * This improves performance by reducing the number of socket emissions per second
 */
class StateUpdateBatcher {
  private pendingUpdates: Map<string, {
    state: any;
    timestamp: number;
    timeoutId: NodeJS.Timeout | null;
  }> = new Map();
  
  private readonly BATCH_DELAY_MS = 100; // Batch updates within 100ms
  private readonly MAX_BATCH_DELAY_MS = 500; // Maximum delay before forcing emission

  /**
   * Schedule a state update for a game
   * Updates are batched - only the latest state is emitted after a delay
   */
  scheduleUpdate(
    gameId: string,
    state: any,
    emitCallback: (gameId: string, state: any) => void
  ): void {
    const now = Date.now();
    const existing = this.pendingUpdates.get(gameId);

    // Update the pending state
    this.pendingUpdates.set(gameId, {
      state,
      timestamp: now,
      timeoutId: existing?.timeoutId || null,
    });

    // Clear existing timeout if any
    if (existing?.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    // Check if we should emit immediately (max delay exceeded)
    const shouldEmitImmediately = existing && (now - existing.timestamp) >= this.MAX_BATCH_DELAY_MS;

    if (shouldEmitImmediately) {
      // Force immediate emission
      this.pendingUpdates.delete(gameId);
      emitCallback(gameId, state);
    } else {
      // Schedule batched emission
      const timeoutId = setTimeout(() => {
        const pending = this.pendingUpdates.get(gameId);
        if (pending) {
          this.pendingUpdates.delete(gameId);
          emitCallback(gameId, pending.state);
        }
      }, this.BATCH_DELAY_MS);

      const pending = this.pendingUpdates.get(gameId);
      if (pending) {
        pending.timeoutId = timeoutId;
      }
    }
  }

  /**
   * Immediately flush and emit all pending updates
   */
  flushAll(emitCallback: (gameId: string, state: any) => void): void {
    for (const [gameId, pending] of this.pendingUpdates.entries()) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      emitCallback(gameId, pending.state);
    }
    this.pendingUpdates.clear();
  }

  /**
   * Cancel a pending update for a game
   */
  cancel(gameId: string): void {
    const pending = this.pendingUpdates.get(gameId);
    if (pending?.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingUpdates.delete(gameId);
  }

  /**
   * Clear all pending updates
   */
  clear(): void {
    for (const pending of this.pendingUpdates.values()) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
    }
    this.pendingUpdates.clear();
  }
}

// Export singleton instance
export const stateUpdateBatcher = new StateUpdateBatcher();

