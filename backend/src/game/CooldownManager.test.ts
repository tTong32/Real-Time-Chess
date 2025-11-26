import { describe, it, expect, beforeEach } from 'vitest';
import { CooldownManager } from './CooldownManager';
import type { PlayerState, PieceType } from './types';
import { PIECE_COOLDOWNS } from './constants';

describe('CooldownManager', () => {
  let basePlayerState: PlayerState;
  let baseTime: number;

  beforeEach(() => {
    baseTime = 1000000; // Base timestamp
    basePlayerState = {
      energy: 6,
      energyRegenRate: 0.5,
      lastEnergyUpdate: baseTime,
      pieceCooldowns: new Map(),
    };
  });

  describe('isOnCooldown', () => {
    it('should return false when piece has no cooldown', () => {
      const result = CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(false);
    });

    it('should return true when piece is on cooldown', () => {
      const cooldownEnd = baseTime + 5000; // 5 seconds from now
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(true);
    });

    it('should return false when cooldown has expired', () => {
      const cooldownEnd = baseTime - 1000; // 1 second ago (expired)
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(false);
    });

    it('should return false when cooldown expires exactly at current time', () => {
      const cooldownEnd = baseTime; // Exactly now
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(false);
    });

    it('should return true when piece has cooldown ending in the future', () => {
      const futureTime = baseTime + 10000; // 10 seconds from now
      const cooldownEnd = futureTime + 5000; // Cooldown ends 15 seconds from now
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.isOnCooldown('piece-1', basePlayerState, futureTime);
      expect(result).toBe(true);
    });

    it('should handle multiple pieces independently', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000); // On cooldown
      basePlayerState.pieceCooldowns.set('piece-2', baseTime - 1000); // Expired
      // piece-3 has no cooldown
      
      expect(CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime)).toBe(true);
      expect(CooldownManager.isOnCooldown('piece-2', basePlayerState, baseTime)).toBe(false);
      expect(CooldownManager.isOnCooldown('piece-3', basePlayerState, baseTime)).toBe(false);
    });
  });

  describe('getRemainingCooldown', () => {
    it('should return 0 when piece has no cooldown', () => {
      const result = CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(0);
    });

    it('should return correct remaining cooldown time', () => {
      const cooldownEnd = baseTime + 5000; // 5 seconds from now
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(5000);
    });

    it('should return 0 when cooldown has expired', () => {
      const cooldownEnd = baseTime - 1000; // 1 second ago
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(0);
    });

    it('should return 0 when cooldown expires exactly at current time', () => {
      const cooldownEnd = baseTime;
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      const result = CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime);
      expect(result).toBe(0);
    });

    it('should return correct remaining time as cooldown progresses', () => {
      const cooldownEnd = baseTime + 10000; // 10 seconds from now
      basePlayerState.pieceCooldowns.set('piece-1', cooldownEnd);
      
      // Check at different times
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime)).toBe(10000);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime + 3000)).toBe(7000);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime + 5000)).toBe(5000);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime + 10000)).toBe(0);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime + 11000)).toBe(0);
    });

    it('should handle multiple pieces independently', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 3000);
      
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime)).toBe(5000);
      expect(CooldownManager.getRemainingCooldown('piece-2', basePlayerState, baseTime)).toBe(3000);
    });
  });

  describe('setCooldown', () => {
    it('should set cooldown for a pawn', () => {
      CooldownManager.setCooldown('piece-1', 'pawn', basePlayerState, baseTime);
      
      const cooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(cooldownEnd).toBe(baseTime + PIECE_COOLDOWNS.pawn * 1000);
    });

    it('should set cooldown for a queen', () => {
      CooldownManager.setCooldown('piece-1', 'queen', basePlayerState, baseTime);
      
      const cooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(cooldownEnd).toBe(baseTime + PIECE_COOLDOWNS.queen * 1000);
    });

    it('should set cooldown for a king', () => {
      CooldownManager.setCooldown('piece-1', 'king', basePlayerState, baseTime);
      
      const cooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(cooldownEnd).toBe(baseTime + PIECE_COOLDOWNS.king * 1000);
    });

    it('should set cooldown for custom pieces', () => {
      CooldownManager.setCooldown('piece-1', 'prince', basePlayerState, baseTime);
      
      const cooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(cooldownEnd).toBe(baseTime + PIECE_COOLDOWNS.prince * 1000);
    });

    it('should overwrite existing cooldown', () => {
      // Set initial cooldown
      const oldCooldownEnd = baseTime + 2000;
      basePlayerState.pieceCooldowns.set('piece-1', oldCooldownEnd);
      
      // Set new cooldown
      CooldownManager.setCooldown('piece-1', 'rook', basePlayerState, baseTime);
      
      const newCooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(newCooldownEnd).toBe(baseTime + PIECE_COOLDOWNS.rook * 1000);
      expect(newCooldownEnd).not.toBe(oldCooldownEnd);
    });

    it('should set cooldown at different times', () => {
      const laterTime = baseTime + 5000;
      CooldownManager.setCooldown('piece-1', 'knight', basePlayerState, laterTime);
      
      const cooldownEnd = basePlayerState.pieceCooldowns.get('piece-1');
      expect(cooldownEnd).toBe(laterTime + PIECE_COOLDOWNS.knight * 1000);
    });

    it('should handle all piece types', () => {
      const pieceTypes: PieceType[] = [
        'pawn',
        'knight',
        'bishop',
        'rook',
        'queen',
        'king',
        'twistedPawn',
        'pawnGeneral',
        'flyingCastle',
        'prince',
        'iceBishop',
      ];

      pieceTypes.forEach((pieceType, index) => {
        const pieceId = `piece-${index}`;
        CooldownManager.setCooldown(pieceId, pieceType, basePlayerState, baseTime);
        
        const cooldownEnd = basePlayerState.pieceCooldowns.get(pieceId);
        expect(cooldownEnd).toBe(baseTime + PIECE_COOLDOWNS[pieceType] * 1000);
      });
    });

    it('should set multiple cooldowns independently', () => {
      CooldownManager.setCooldown('piece-1', 'pawn', basePlayerState, baseTime);
      CooldownManager.setCooldown('piece-2', 'queen', basePlayerState, baseTime);
      
      expect(basePlayerState.pieceCooldowns.get('piece-1')).toBe(
        baseTime + PIECE_COOLDOWNS.pawn * 1000
      );
      expect(basePlayerState.pieceCooldowns.get('piece-2')).toBe(
        baseTime + PIECE_COOLDOWNS.queen * 1000
      );
    });
  });

  describe('clearCooldown', () => {
    it('should remove cooldown from piece', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      
      CooldownManager.clearCooldown('piece-1', basePlayerState);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
      expect(CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime)).toBe(false);
    });

    it('should not error when clearing non-existent cooldown', () => {
      expect(() => {
        CooldownManager.clearCooldown('piece-1', basePlayerState);
      }).not.toThrow();
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
    });

    it('should only remove specified piece cooldown', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 3000);
      
      CooldownManager.clearCooldown('piece-1', basePlayerState);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(true);
    });

    it('should handle clearing multiple cooldowns', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 3000);
      basePlayerState.pieceCooldowns.set('piece-3', baseTime + 7000);
      
      CooldownManager.clearCooldown('piece-1', basePlayerState);
      CooldownManager.clearCooldown('piece-3', basePlayerState);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(true);
      expect(basePlayerState.pieceCooldowns.has('piece-3')).toBe(false);
    });
  });

  describe('updateCooldowns', () => {
    it('should remove expired cooldowns', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime - 1000); // Expired
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 5000); // Still active
      
      CooldownManager.updateCooldowns(basePlayerState, baseTime);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(true);
    });

    it('should not remove active cooldowns', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 3000);
      
      CooldownManager.updateCooldowns(basePlayerState, baseTime);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(true);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(true);
    });

    it('should remove cooldowns that expire exactly at current time', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime);
      
      CooldownManager.updateCooldowns(basePlayerState, baseTime);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
    });

    it('should handle empty cooldown map', () => {
      expect(() => {
        CooldownManager.updateCooldowns(basePlayerState, baseTime);
      }).not.toThrow();
      
      expect(basePlayerState.pieceCooldowns.size).toBe(0);
    });

    it('should remove all expired cooldowns', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime - 1000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime - 500);
      basePlayerState.pieceCooldowns.set('piece-3', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-4', baseTime + 3000);
      
      CooldownManager.updateCooldowns(basePlayerState, baseTime);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(false);
      expect(basePlayerState.pieceCooldowns.has('piece-3')).toBe(true);
      expect(basePlayerState.pieceCooldowns.has('piece-4')).toBe(true);
    });

    it('should handle update at different times', () => {
      basePlayerState.pieceCooldowns.set('piece-1', baseTime + 5000);
      basePlayerState.pieceCooldowns.set('piece-2', baseTime + 3000);
      
      // Update at time when piece-2 expires but piece-1 doesn't
      const updateTime = baseTime + 4000;
      CooldownManager.updateCooldowns(basePlayerState, updateTime);
      
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(true);
      expect(basePlayerState.pieceCooldowns.has('piece-2')).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full cooldown cycle', () => {
      // Set cooldown
      CooldownManager.setCooldown('piece-1', 'pawn', basePlayerState, baseTime);
      expect(CooldownManager.isOnCooldown('piece-1', basePlayerState, baseTime)).toBe(true);
      
      // Check remaining time
      const remaining = CooldownManager.getRemainingCooldown('piece-1', basePlayerState, baseTime);
      expect(remaining).toBe(PIECE_COOLDOWNS.pawn * 1000);
      
      // Wait for cooldown to expire
      const expiredTime = baseTime + PIECE_COOLDOWNS.pawn * 1000;
      expect(CooldownManager.isOnCooldown('piece-1', basePlayerState, expiredTime)).toBe(false);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, expiredTime)).toBe(0);
      
      // Clean up expired cooldowns
      CooldownManager.updateCooldowns(basePlayerState, expiredTime);
      expect(basePlayerState.pieceCooldowns.has('piece-1')).toBe(false);
    });

    it('should handle multiple pieces with different cooldowns', () => {
      // Set cooldowns for different pieces
      CooldownManager.setCooldown('pawn-1', 'pawn', basePlayerState, baseTime);
      CooldownManager.setCooldown('queen-1', 'queen', basePlayerState, baseTime);
      CooldownManager.setCooldown('king-1', 'king', basePlayerState, baseTime);
      
      // Check all are on cooldown
      expect(CooldownManager.isOnCooldown('pawn-1', basePlayerState, baseTime)).toBe(true);
      expect(CooldownManager.isOnCooldown('queen-1', basePlayerState, baseTime)).toBe(true);
      expect(CooldownManager.isOnCooldown('king-1', basePlayerState, baseTime)).toBe(true);
      
      // Check remaining times
      expect(CooldownManager.getRemainingCooldown('pawn-1', basePlayerState, baseTime)).toBe(
        PIECE_COOLDOWNS.pawn * 1000
      );
      expect(CooldownManager.getRemainingCooldown('queen-1', basePlayerState, baseTime)).toBe(
        PIECE_COOLDOWNS.queen * 1000
      );
      expect(CooldownManager.getRemainingCooldown('king-1', basePlayerState, baseTime)).toBe(
        PIECE_COOLDOWNS.king * 1000
      );
      
      // Clear one cooldown manually
      CooldownManager.clearCooldown('queen-1', basePlayerState);
      expect(CooldownManager.isOnCooldown('queen-1', basePlayerState, baseTime)).toBe(false);
      expect(CooldownManager.isOnCooldown('pawn-1', basePlayerState, baseTime)).toBe(true);
      expect(CooldownManager.isOnCooldown('king-1', basePlayerState, baseTime)).toBe(true);
    });

    it('should handle setting new cooldown after previous expires', () => {
      // Set initial cooldown
      CooldownManager.setCooldown('piece-1', 'knight', basePlayerState, baseTime);
      
      // Wait for it to expire
      const expiredTime = baseTime + PIECE_COOLDOWNS.knight * 1000 + 1000;
      CooldownManager.updateCooldowns(basePlayerState, expiredTime);
      
      // Set new cooldown
      CooldownManager.setCooldown('piece-1', 'rook', basePlayerState, expiredTime);
      
      expect(CooldownManager.isOnCooldown('piece-1', basePlayerState, expiredTime)).toBe(true);
      expect(CooldownManager.getRemainingCooldown('piece-1', basePlayerState, expiredTime)).toBe(
        PIECE_COOLDOWNS.rook * 1000
      );
    });
  });
});

