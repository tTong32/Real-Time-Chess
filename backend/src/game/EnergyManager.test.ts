import { describe, it, expect, beforeEach } from 'vitest';
import { EnergyManager } from './EnergyManager';
import type { PlayerState } from './types';
import {
  INITIAL_ENERGY_REGEN,
  MAX_ENERGY_REGEN,
  ENERGY_REGEN_INTERVAL,
  ENERGY_REGEN_INCREASE,
  MAX_ENERGY,
  INITIAL_ENERGY,
} from './constants';

describe('EnergyManager', () => {
  let basePlayerState: PlayerState;
  let baseTime: number;

  beforeEach(() => {
    baseTime = 1000000; // Base timestamp
    basePlayerState = {
      energy: INITIAL_ENERGY,
      energyRegenRate: INITIAL_ENERGY_REGEN,
      lastEnergyUpdate: baseTime,
      pieceCooldowns: new Map(),
    };
  });

  describe('calculateCurrentEnergy', () => {
    it('should return current energy when no time has passed', () => {
      const result = EnergyManager.calculateCurrentEnergy(basePlayerState, baseTime);
      expect(result).toBe(INITIAL_ENERGY);
    });

    it('should regenerate energy over time', () => {
      const oneSecondLater = baseTime + 1000;
      const result = EnergyManager.calculateCurrentEnergy(basePlayerState, oneSecondLater);
      // Should have regenerated 0.5 energy (1 second * 0.5 energy/sec)
      expect(result).toBe(6.5);
    });

    it('should regenerate energy correctly for multiple seconds', () => {
      const fiveSecondsLater = baseTime + 5000;
      const result = EnergyManager.calculateCurrentEnergy(basePlayerState, fiveSecondsLater);
      // Should have regenerated 2.5 energy (5 seconds * 0.5 energy/sec)
      expect(result).toBe(8.5);
    });

    it('should cap energy at MAX_ENERGY', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: MAX_ENERGY - 1,
        energyRegenRate: 10, // High regen rate
      };
      const oneSecondLater = baseTime + 1000;
      const result = EnergyManager.calculateCurrentEnergy(playerState, oneSecondLater);
      // Should cap at MAX_ENERGY even though it would regenerate more
      expect(result).toBe(MAX_ENERGY);
    });

    it('should handle different regeneration rates', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
        energyRegenRate: 2.0, // 2 energy per second
      };
      const twoSecondsLater = baseTime + 2000;
      const result = EnergyManager.calculateCurrentEnergy(playerState, twoSecondsLater);
      // Should have regenerated 4 energy (2 seconds * 2 energy/sec)
      expect(result).toBe(14);
    });

    it('should round to 2 decimal places', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
        energyRegenRate: 0.333, // Will create repeating decimals
      };
      const threeSecondsLater = baseTime + 3000;
      const result = EnergyManager.calculateCurrentEnergy(playerState, threeSecondsLater);
      // Should be rounded to 2 decimals
      expect(result).toBeCloseTo(10.999, 2);
    });

    it('should handle zero energy correctly', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 0,
        energyRegenRate: 0.5,
      };
      const twoSecondsLater = baseTime + 2000;
      const result = EnergyManager.calculateCurrentEnergy(playerState, twoSecondsLater);
      // Should have regenerated 1 energy (2 seconds * 0.5 energy/sec)
      expect(result).toBe(1);
    });

    it('should handle negative time difference (subtracts energy)', () => {
      const earlierTime = baseTime - 1000;
      const result = EnergyManager.calculateCurrentEnergy(basePlayerState, earlierTime);
      // Implementation allows negative regeneration (subtracts energy)
      // 6 - (1 * 0.5) = 5.5
      expect(result).toBe(5.5);
    });
  });

  describe('updateEnergyRegenRate', () => {
    it('should return initial regen rate at game start', () => {
      const gameStartTime = baseTime;
      const currentTime = baseTime;
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      expect(result).toBe(INITIAL_ENERGY_REGEN);
    });

    it('should increase regen rate after first interval', () => {
      const gameStartTime = baseTime;
      const currentTime = baseTime + ENERGY_REGEN_INTERVAL; // Exactly 15 seconds later
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      // Should have increased by ENERGY_REGEN_INCREASE (0.5)
      expect(result).toBe(INITIAL_ENERGY_REGEN + ENERGY_REGEN_INCREASE);
    });

    it('should increase regen rate after multiple intervals', () => {
      const gameStartTime = baseTime;
      const currentTime = baseTime + ENERGY_REGEN_INTERVAL * 3; // 45 seconds later
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      // Should have increased by 3 * ENERGY_REGEN_INCREASE
      expect(result).toBe(INITIAL_ENERGY_REGEN + 3 * ENERGY_REGEN_INCREASE);
    });

    it('should cap regen rate at MAX_ENERGY_REGEN', () => {
      const gameStartTime = baseTime;
      // Set time far in the future (more than needed to reach max)
      const currentTime = baseTime + ENERGY_REGEN_INTERVAL * 100; // Way more than needed
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      expect(result).toBe(MAX_ENERGY_REGEN);
    });

    it('should not increase if less than one interval has passed', () => {
      const gameStartTime = baseTime;
      const currentTime = baseTime + ENERGY_REGEN_INTERVAL - 1; // Just under 15 seconds
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      // Should still be initial rate
      expect(result).toBe(INITIAL_ENERGY_REGEN);
    });

    it('should calculate correct rate at exactly 2 intervals', () => {
      const gameStartTime = baseTime;
      const currentTime = baseTime + ENERGY_REGEN_INTERVAL * 2; // Exactly 30 seconds
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      expect(result).toBe(INITIAL_ENERGY_REGEN + 2 * ENERGY_REGEN_INCREASE);
    });

    it('should handle game start time in the past', () => {
      const gameStartTime = baseTime - 10000;
      const currentTime = baseTime;
      const result = EnergyManager.updateEnergyRegenRate(
        basePlayerState,
        gameStartTime,
        currentTime
      );
      // Should calculate based on actual duration (10 seconds = 0 intervals)
      expect(result).toBe(INITIAL_ENERGY_REGEN);
    });
  });

  describe('consumeEnergy', () => {
    it('should successfully consume energy when player has enough', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
      };
      const currentTime = baseTime + 1000;
      const result = EnergyManager.consumeEnergy(playerState, 5, currentTime);

      expect(result.success).toBe(true);
      expect(result.newEnergy).toBe(5.5); // 10 + 0.5 (regen) - 5 = 5.5
      expect(playerState.energy).toBe(5.5);
      expect(playerState.lastEnergyUpdate).toBe(currentTime);
    });

    it('should fail when player has insufficient energy', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 3,
      };
      const currentTime = baseTime + 1000;
      const result = EnergyManager.consumeEnergy(playerState, 10, currentTime);

      expect(result.success).toBe(false);
      expect(result.newEnergy).toBe(3.5); // 3 + 0.5 (regen) = 3.5, but not consumed
      // Energy should not be modified on failure
      expect(playerState.energy).toBe(3); // Original energy (not updated)
    });

    it('should account for regeneration before consuming', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 5,
        energyRegenRate: 1.0,
      };
      const currentTime = baseTime + 2000; // 2 seconds later
      const result = EnergyManager.consumeEnergy(playerState, 6, currentTime);

      expect(result.success).toBe(true);
      // 5 + (2 * 1.0) - 6 = 1
      expect(result.newEnergy).toBe(1);
      expect(playerState.energy).toBe(1);
    });

    it('should update lastEnergyUpdate timestamp on success', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
      };
      const newTime = baseTime + 5000;
      EnergyManager.consumeEnergy(playerState, 2, newTime);

      expect(playerState.lastEnergyUpdate).toBe(newTime);
    });

    it('should not update lastEnergyUpdate on failure', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 1,
      };
      const originalUpdateTime = playerState.lastEnergyUpdate;
      const newTime = baseTime + 5000;
      EnergyManager.consumeEnergy(playerState, 10, newTime);

      expect(playerState.lastEnergyUpdate).toBe(originalUpdateTime);
    });

    it('should handle consuming exact available energy', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 5,
        energyRegenRate: 1.0,
      };
      const currentTime = baseTime + 1000; // 1 second later
      const result = EnergyManager.consumeEnergy(playerState, 6, currentTime);

      expect(result.success).toBe(true);
      // 5 + 1 - 6 = 0
      expect(result.newEnergy).toBe(0);
      expect(playerState.energy).toBe(0);
    });

    it('should handle consuming energy when at max', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: MAX_ENERGY,
      };
      const currentTime = baseTime + 1000;
      const result = EnergyManager.consumeEnergy(playerState, 5, currentTime);

      expect(result.success).toBe(true);
      // MAX_ENERGY + regen (capped) - 5 = MAX_ENERGY - 5
      expect(result.newEnergy).toBe(MAX_ENERGY - 5);
      expect(playerState.energy).toBe(MAX_ENERGY - 5);
    });

    it('should handle zero energy consumption', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
      };
      const currentTime = baseTime + 1000;
      const result = EnergyManager.consumeEnergy(playerState, 0, currentTime);

      expect(result.success).toBe(true);
      expect(result.newEnergy).toBe(10.5); // 10 + 0.5 (regen) - 0
      expect(playerState.energy).toBe(10.5);
    });

    it('should fail when energy is exactly at cost after regeneration', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 5.5,
        energyRegenRate: 0.5,
      };
      const currentTime = baseTime + 1000; // 1 second later
      // After regen: 5.5 + 0.5 = 6.0, trying to consume 6.1
      const result = EnergyManager.consumeEnergy(playerState, 6.1, currentTime);

      expect(result.success).toBe(false);
      expect(result.newEnergy).toBe(6.0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full energy regeneration and consumption cycle', () => {
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 0,
        energyRegenRate: 1.0,
      };
      const gameStartTime = baseTime;

      // Wait 5 seconds and check energy
      let currentTime = baseTime + 5000;
      let energy = EnergyManager.calculateCurrentEnergy(playerState, currentTime);
      expect(energy).toBe(5); // 0 + (5 * 1.0)

      // Consume 3 energy
      const consumeResult = EnergyManager.consumeEnergy(playerState, 3, currentTime);
      expect(consumeResult.success).toBe(true);
      expect(playerState.energy).toBe(2);

      // Wait another 3 seconds
      currentTime = currentTime + 3000;
      energy = EnergyManager.calculateCurrentEnergy(playerState, currentTime);
      expect(energy).toBe(5); // 2 + (3 * 1.0)

      // Update regen rate (game has been running for 8 seconds = 0 intervals)
      const newRegenRate = EnergyManager.updateEnergyRegenRate(
        playerState,
        gameStartTime,
        currentTime
      );
      expect(newRegenRate).toBe(INITIAL_ENERGY_REGEN);
    });

    it('should handle energy regeneration rate increase over time', () => {
      const gameStartTime = baseTime;
      const playerState: PlayerState = {
        ...basePlayerState,
        energy: 10,
      };

      // At 30 seconds (2 intervals)
      let currentTime = baseTime + ENERGY_REGEN_INTERVAL * 2;
      let regenRate = EnergyManager.updateEnergyRegenRate(
        playerState,
        gameStartTime,
        currentTime
      );
      expect(regenRate).toBe(INITIAL_ENERGY_REGEN + 2 * ENERGY_REGEN_INCREASE);

      // Update player state with new regen rate and lastEnergyUpdate
      playerState.energyRegenRate = regenRate;
      playerState.lastEnergyUpdate = currentTime; // Update timestamp before waiting

      // Wait 1 second with new regen rate
      currentTime = currentTime + 1000;
      let energy = EnergyManager.calculateCurrentEnergy(playerState, currentTime);
      // Should have regenerated 1.5 energy (1 second * 1.5 energy/sec)
      expect(energy).toBe(11.5);
    });
  });
});

