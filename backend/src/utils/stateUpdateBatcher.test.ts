import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { stateUpdateBatcher } from './stateUpdateBatcher';

describe('StateUpdateBatcher', () => {
  beforeEach(() => {
    // Clear all pending updates before each test
    stateUpdateBatcher.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
  });

  describe('scheduleUpdate', () => {
    it('should batch multiple rapid updates and emit only once', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state1 = { status: 'active', turn: 1 };
      const state2 = { status: 'active', turn: 2 };
      const state3 = { status: 'active', turn: 3 };

      // Schedule multiple updates rapidly
      stateUpdateBatcher.scheduleUpdate(gameId, state1, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId, state2, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId, state3, emitCallback);

      // Fast-forward time by batch delay (100ms)
      await vi.advanceTimersByTimeAsync(100);

      // Should only emit once with the latest state
      expect(emitCallback).toHaveBeenCalledTimes(1);
      expect(emitCallback).toHaveBeenCalledWith(gameId, state3);
    });

    it('should emit updates for different games independently', async () => {
      const emitCallback = vi.fn();
      const gameId1 = 'game-1';
      const gameId2 = 'game-2';
      const state1 = { status: 'active' };
      const state2 = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId1, state1, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId2, state2, emitCallback);

      await vi.advanceTimersByTimeAsync(100);

      // Should emit once for each game
      expect(emitCallback).toHaveBeenCalledTimes(2);
      expect(emitCallback).toHaveBeenCalledWith(gameId1, state1);
      expect(emitCallback).toHaveBeenCalledWith(gameId2, state2);
    });

    it('should emit immediately if max delay is exceeded', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state1 = { status: 'active', turn: 1 };
      const state2 = { status: 'active', turn: 2 };

      // Schedule first update
      stateUpdateBatcher.scheduleUpdate(gameId, state1, emitCallback);

      // Fast-forward past max delay (500ms)
      await vi.advanceTimersByTimeAsync(500);

      // Should have emitted after max delay
      expect(emitCallback).toHaveBeenCalledWith(gameId, state1);

      // Schedule another update
      stateUpdateBatcher.scheduleUpdate(gameId, state2, emitCallback);

      // Fast-forward past batch delay
      await vi.advanceTimersByTimeAsync(100);

      // Should emit the second update
      expect(emitCallback).toHaveBeenCalledWith(gameId, state2);
      expect(emitCallback).toHaveBeenCalledTimes(2);
    });

    it('should cancel previous timeout when new update is scheduled', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state1 = { status: 'active', turn: 1 };
      const state2 = { status: 'active', turn: 2 };

      // Schedule first update
      stateUpdateBatcher.scheduleUpdate(gameId, state1, emitCallback);

      // Before timeout fires, schedule another update
      await vi.advanceTimersByTimeAsync(50);
      stateUpdateBatcher.scheduleUpdate(gameId, state2, emitCallback);

      // Fast-forward to batch delay
      await vi.advanceTimersByTimeAsync(100);

      // Should only emit once with the latest state
      expect(emitCallback).toHaveBeenCalledTimes(1);
      expect(emitCallback).toHaveBeenCalledWith(gameId, state2);
    });

    it('should handle multiple rapid updates with proper batching', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const states = [
        { turn: 1 },
        { turn: 2 },
        { turn: 3 },
        { turn: 4 },
        { turn: 5 },
      ];

      // Schedule many updates rapidly
      states.forEach((state) => {
        stateUpdateBatcher.scheduleUpdate(gameId, state, emitCallback);
      });

      // Fast-forward batch delay
      await vi.advanceTimersByTimeAsync(100);

      // Should only emit once with the last state
      expect(emitCallback).toHaveBeenCalledTimes(1);
      expect(emitCallback).toHaveBeenCalledWith(gameId, states[states.length - 1]);
    });
  });

  describe('flushAll', () => {
    it('should immediately emit all pending updates', async () => {
      const emitCallback = vi.fn();
      const gameId1 = 'game-1';
      const gameId2 = 'game-2';
      const state1 = { status: 'active' };
      const state2 = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId1, state1, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId2, state2, emitCallback);

      // Flush before batch delay
      stateUpdateBatcher.flushAll(emitCallback);

      // Should emit all updates immediately
      expect(emitCallback).toHaveBeenCalledTimes(2);
      expect(emitCallback).toHaveBeenCalledWith(gameId1, state1);
      expect(emitCallback).toHaveBeenCalledWith(gameId2, state2);

      // Fast-forward time - should not emit again
      await vi.advanceTimersByTimeAsync(100);
      expect(emitCallback).toHaveBeenCalledTimes(2);
    });

    it('should clear all pending updates after flush', () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId, state, emitCallback);
      stateUpdateBatcher.flushAll(emitCallback);

      // Schedule new update after flush
      const newState = { status: 'finished' };
      stateUpdateBatcher.scheduleUpdate(gameId, newState, emitCallback);

      // Flush again
      stateUpdateBatcher.flushAll(emitCallback);

      // Should only have the new state
      expect(emitCallback).toHaveBeenCalledWith(gameId, newState);
      expect(emitCallback).toHaveBeenCalledTimes(3); // initial state, flush all (2 times), new state
    });
  });

  describe('cancel', () => {
    it('should cancel a pending update for a specific game', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId, state, emitCallback);

      // Cancel before timeout
      stateUpdateBatcher.cancel(gameId);

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(100);

      // Should not emit
      expect(emitCallback).not.toHaveBeenCalled();
    });

    it('should handle canceling non-existent game gracefully', () => {
      expect(() => {
        stateUpdateBatcher.cancel('non-existent-game');
      }).not.toThrow();
    });

    it('should not affect other games when canceling one', async () => {
      const emitCallback = vi.fn();
      const gameId1 = 'game-1';
      const gameId2 = 'game-2';
      const state1 = { status: 'active' };
      const state2 = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId1, state1, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId2, state2, emitCallback);

      // Cancel one game
      stateUpdateBatcher.cancel(gameId1);

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(100);

      // Should only emit for the non-canceled game
      expect(emitCallback).toHaveBeenCalledTimes(1);
      expect(emitCallback).toHaveBeenCalledWith(gameId2, state2);
    });
  });

  describe('clear', () => {
    it('should clear all pending updates', async () => {
      const emitCallback = vi.fn();
      const gameId1 = 'game-1';
      const gameId2 = 'game-2';
      const state1 = { status: 'active' };
      const state2 = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId1, state1, emitCallback);
      stateUpdateBatcher.scheduleUpdate(gameId2, state2, emitCallback);

      // Clear all
      stateUpdateBatcher.clear();

      // Fast-forward time
      await vi.advanceTimersByTimeAsync(100);

      // Should not emit anything
      expect(emitCallback).not.toHaveBeenCalled();
    });

    it('should cancel all timeouts when clearing', () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const state = { status: 'active' };

      stateUpdateBatcher.scheduleUpdate(gameId, state, emitCallback);
      stateUpdateBatcher.clear();

      // Schedule new update after clear
      const newState = { status: 'finished' };
      stateUpdateBatcher.scheduleUpdate(gameId, newState, emitCallback);

      // Should work normally after clear
      stateUpdateBatcher.flushAll(emitCallback);
      expect(emitCallback).toHaveBeenCalledWith(gameId, newState);
    });
  });

  describe('performance', () => {
    it('should handle many rapid updates efficiently', async () => {
      const emitCallback = vi.fn();
      const gameId = 'game-1';
      const startTime = Date.now();

      // Schedule 100 rapid updates
      for (let i = 0; i < 100; i++) {
        stateUpdateBatcher.scheduleUpdate(gameId, { turn: i }, emitCallback);
      }

      await vi.advanceTimersByTimeAsync(100);

      // Should only emit once
      expect(emitCallback).toHaveBeenCalledTimes(1);
      expect(emitCallback).toHaveBeenCalledWith(gameId, { turn: 99 });
    });

    it('should handle multiple games with many updates', async () => {
      const emitCallback = vi.fn();
      const numGames = 10;
      const updatesPerGame = 10;

      // Schedule updates for multiple games
      for (let game = 0; game < numGames; game++) {
        for (let update = 0; update < updatesPerGame; update++) {
          stateUpdateBatcher.scheduleUpdate(
            `game-${game}`,
            { turn: update },
            emitCallback
          );
        }
      }

      await vi.advanceTimersByTimeAsync(100);

      // Should emit once per game
      expect(emitCallback).toHaveBeenCalledTimes(numGames);
      
      // Each game should have its latest state
      for (let game = 0; game < numGames; game++) {
        expect(emitCallback).toHaveBeenCalledWith(`game-${game}`, { turn: updatesPerGame - 1 });
      }
    });
  });
});

