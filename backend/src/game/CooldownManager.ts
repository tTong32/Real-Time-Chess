import { PlayerState, PieceType } from './types';
import { PIECE_COOLDOWNS } from './constants';

export class CooldownManager {
  /**
   * Check if a piece is currently on cooldown
   * @param pieceId - The ID of the piece to check
   * @param playerState - The player's state (contains pieceCooldowns map)
   * @param currentTime - Current timestamp in milliseconds
   * @returns true if piece is on cooldown, false otherwise
   */
  static isOnCooldown(
    pieceId: string,
    playerState: PlayerState,
    currentTime: number
  ): boolean {
    const cooldownEnd = playerState.pieceCooldowns.get(pieceId);
    if (!cooldownEnd) return false;
    return currentTime < cooldownEnd;
  }

  /**
   * Get the remaining cooldown time for a piece in milliseconds
   * @param pieceId - The ID of the piece
   * @param playerState - The player's state
   * @param currentTime - Current timestamp in milliseconds
   * @returns Remaining cooldown in milliseconds (0 if not on cooldown or expired)
   */
  static getRemainingCooldown(
    pieceId: string,
    playerState: PlayerState,
    currentTime: number
  ): number {
    const cooldownEnd = playerState.pieceCooldowns.get(pieceId);
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - currentTime);
  }

  /**
   * Set a cooldown for a piece after it moves
   * @param pieceId - The ID of the piece that moved
   * @param pieceType - The type of piece (to get cooldown duration)
   * @param playerState - The player's state (will be modified)
   * @param currentTime - Current timestamp in milliseconds
   */
  static setCooldown(
    pieceId: string,
    pieceType: PieceType,
    playerState: PlayerState,
    currentTime: number
  ): void {
    const cooldownDuration = PIECE_COOLDOWNS[pieceType] * 1000; // Convert to milliseconds
    const cooldownEnd = currentTime + cooldownDuration;
    playerState.pieceCooldowns.set(pieceId, cooldownEnd);
  }

  /**
   * Manually remove a cooldown from a piece
   * @param pieceId - The ID of the piece
   * @param playerState - The player's state (will be modified)
   */
  static clearCooldown(pieceId: string, playerState: PlayerState): void {
    playerState.pieceCooldowns.delete(pieceId);
  }

  /**
   * Clean up expired cooldowns from the map (performance optimization)
   * @param playerState - The player's state (will be modified)
   * @param currentTime - Current timestamp in milliseconds
   */
  static updateCooldowns(playerState: PlayerState, currentTime: number): void {
    // Remove expired cooldowns
    for (const [pieceId, cooldownEnd] of playerState.pieceCooldowns.entries()) {
      if (currentTime >= cooldownEnd) {
        playerState.pieceCooldowns.delete(pieceId);
      }
    }
  }
}