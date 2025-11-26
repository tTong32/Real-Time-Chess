import { PlayerState } from './types';
import {
  INITIAL_ENERGY_REGEN,
  ENERGY_REGEN_INCREASE,
  MAX_ENERGY_REGEN,
  ENERGY_REGEN_INTERVAL,
  MAX_ENERGY,
} from './constants';

export class EnergyManager {
  /**
   * Calculate the player's current energy accounting for regeneration
   * @param playerState - The player's state (energy, cooldowns)
   * @param currentTime - Current timestamp in milliseconds
   * @returns The calculated current energy (capped at MAX_ENERGY)
   */
  static calculateCurrentEnergy(
    playerState: PlayerState,
    currentTime: number
  ): number {
    const elapsed = (currentTime - playerState.lastEnergyUpdate) / 1000; // Convert to seconds
    const regenerated = elapsed * playerState.energyRegenRate;
    const newEnergy = Math.min(MAX_ENERGY, playerState.energy + regenerated);
    return Math.round(newEnergy * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate the energy regeneration rate based on game duration
   * @param playerState - The player's state (not modified, but included for consistency)
   * @param gameStartTime - The timestamp of when the game started
   * @param currentTime - Current timestamp in milliseconds
   * @returns The new energy regeneration rate (capped at MAX_ENERGY_REGEN)
   */
  static updateEnergyRegenRate(
    playerState: PlayerState,
    gameStartTime: number,
    currentTime: number
  ): number {
    const gameDuration = currentTime - gameStartTime;
    const intervalsPassed = Math.floor(gameDuration / ENERGY_REGEN_INTERVAL);
    const newRate = Math.min(
      MAX_ENERGY_REGEN,
      INITIAL_ENERGY_REGEN + intervalsPassed * ENERGY_REGEN_INCREASE
    );
    return newRate;
  }

  /**
   * Consume energy for a move
   * @param playerState - The player's state (will be modified)
   * @param amount - The amount of energy to consume
   * @param currentTime - Current timestamp in milliseconds
   * @returns Object with success flag and new energy value
   */
  static consumeEnergy(
    playerState: PlayerState,
    amount: number,
    currentTime: number
  ): { success: boolean; newEnergy: number } {
    const currentEnergy = this.calculateCurrentEnergy(playerState, currentTime);

    if (currentEnergy < amount) {
      return { success: false, newEnergy: currentEnergy };
    }

    const newEnergy = currentEnergy - amount;
    playerState.energy = newEnergy;
    playerState.lastEnergyUpdate = currentTime;

    return { success: true, newEnergy };
  }
}

