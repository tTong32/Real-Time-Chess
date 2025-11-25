import { describe, it, expect } from 'vitest';
import type { PieceType, PieceColor, Piece, PlayerState, GameState, MoveAttempt } from './types';

describe('Game Types', () => {
  describe('PieceType', () => {
    it('should accept all standard piece types', () => {
      const standardPieces: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
      standardPieces.forEach(piece => {
        expect(typeof piece).toBe('string');
      });
    });

    it('should accept all custom piece types', () => {
      const customPieces: PieceType[] = [
        'twistedPawn',
        'pawnGeneral',
        'flyingCastle',
        'prince',
        'iceBishop',
      ];
      customPieces.forEach(piece => {
        expect(typeof piece).toBe('string');
      });
    });
  });

  describe('PieceColor', () => {
    it('should accept white and black', () => {
      const colors: PieceColor[] = ['white', 'black'];
      colors.forEach(color => {
        expect(['white', 'black']).toContain(color);
      });
    });
  });

  describe('Piece interface', () => {
    it('should create a valid piece object', () => {
      const piece: Piece = {
        id: 'piece-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };

      expect(piece.id).toBe('piece-1');
      expect(piece.type).toBe('pawn');
      expect(piece.color).toBe('white');
      expect(piece.row).toBe(6);
      expect(piece.col).toBe(0);
      expect(piece.hasMoved).toBe(false);
    });

    it('should support optional canPreventCapture for Prince', () => {
      const prince: Piece = {
        id: 'prince-1',
        type: 'prince',
        color: 'white',
        row: 0,
        col: 1,
        hasMoved: false,
        canPreventCapture: true,
      };

      expect(prince.canPreventCapture).toBe(true);
    });
  });

  describe('PlayerState interface', () => {
    it('should create a valid player state', () => {
      const playerState: PlayerState = {
        energy: 6,
        energyRegenRate: 0.5,
        lastEnergyUpdate: Date.now(),
        pieceCooldowns: new Map(),
      };

      expect(playerState.energy).toBe(6);
      expect(playerState.energyRegenRate).toBe(0.5);
      expect(playerState.pieceCooldowns).toBeInstanceOf(Map);
    });

    it('should support piece cooldowns map', () => {
      const cooldowns = new Map<string, number>();
      cooldowns.set('piece-1', Date.now() + 4000);

      const playerState: PlayerState = {
        energy: 6,
        energyRegenRate: 0.5,
        lastEnergyUpdate: Date.now(),
        pieceCooldowns: cooldowns,
      };

      expect(playerState.pieceCooldowns.has('piece-1')).toBe(true);
    });
  });

  describe('MoveAttempt interface', () => {
    it('should create a valid move attempt', () => {
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player-1',
        timestamp: Date.now(),
      };

      expect(move.fromRow).toBe(6);
      expect(move.fromCol).toBe(0);
      expect(move.toRow).toBe(5);
      expect(move.toCol).toBe(0);
      expect(move.playerId).toBe('player-1');
      expect(typeof move.timestamp).toBe('number');
    });
  });
});

