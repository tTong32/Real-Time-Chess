import { describe, it, expect } from 'vitest';
import {
  PIECE_COOLDOWNS,
  PIECE_ENERGY_COSTS,
  PIECE_POINT_VALUES,
  INITIAL_ENERGY,
  MAX_ENERGY,
  INITIAL_ENERGY_REGEN,
  ENERGY_REGEN_INCREASE,
  MAX_ENERGY_REGEN,
  ENERGY_REGEN_INTERVAL,
  BOARD_SIZE,
  ROWS,
  COLS,
} from './constants';
import type { PieceType } from './types';

const ALL_PIECE_TYPES: PieceType[] = [
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

describe('Piece Constants', () => {
  describe('PIECE_COOLDOWNS', () => {
    it('should have cooldown for all piece types', () => {
      ALL_PIECE_TYPES.forEach(pieceType => {
        expect(PIECE_COOLDOWNS[pieceType]).toBeDefined();
        expect(typeof PIECE_COOLDOWNS[pieceType]).toBe('number');
        expect(PIECE_COOLDOWNS[pieceType]).toBeGreaterThan(0);
      });
    });

    it('should have correct standard piece cooldowns', () => {
      expect(PIECE_COOLDOWNS.pawn).toBe(4);
      expect(PIECE_COOLDOWNS.knight).toBe(5);
      expect(PIECE_COOLDOWNS.bishop).toBe(6);
      expect(PIECE_COOLDOWNS.rook).toBe(7);
      expect(PIECE_COOLDOWNS.queen).toBe(9);
      expect(PIECE_COOLDOWNS.king).toBe(11);
    });

    it('should have cooldowns within expected range (4-11 seconds)', () => {
      ALL_PIECE_TYPES.forEach(pieceType => {
        const cooldown = PIECE_COOLDOWNS[pieceType];
        expect(cooldown).toBeGreaterThanOrEqual(4);
        expect(cooldown).toBeLessThanOrEqual(11);
      });
    });

    it('should have matching cooldowns for equivalent custom pieces', () => {
      expect(PIECE_COOLDOWNS.twistedPawn).toBe(PIECE_COOLDOWNS.pawn);
      expect(PIECE_COOLDOWNS.prince).toBe(PIECE_COOLDOWNS.knight);
      expect(PIECE_COOLDOWNS.iceBishop).toBe(PIECE_COOLDOWNS.bishop);
      expect(PIECE_COOLDOWNS.flyingCastle).toBe(PIECE_COOLDOWNS.rook);
    });
  });

  describe('PIECE_ENERGY_COSTS', () => {
    it('should have energy cost for all piece types', () => {
      ALL_PIECE_TYPES.forEach(pieceType => {
        expect(PIECE_ENERGY_COSTS[pieceType]).toBeDefined();
        expect(typeof PIECE_ENERGY_COSTS[pieceType]).toBe('number');
        expect(PIECE_ENERGY_COSTS[pieceType]).toBeGreaterThan(0);
      });
    });

    it('should have correct standard piece energy costs', () => {
      expect(PIECE_ENERGY_COSTS.pawn).toBe(2);
      expect(PIECE_ENERGY_COSTS.knight).toBe(3);
      expect(PIECE_ENERGY_COSTS.bishop).toBe(4);
      expect(PIECE_ENERGY_COSTS.rook).toBe(5);
      expect(PIECE_ENERGY_COSTS.queen).toBe(8);
      expect(PIECE_ENERGY_COSTS.king).toBe(10);
    });

    it('should have energy costs within expected range (2-10)', () => {
      ALL_PIECE_TYPES.forEach(pieceType => {
        const energyCost = PIECE_ENERGY_COSTS[pieceType];
        expect(energyCost).toBeGreaterThanOrEqual(2);
        expect(energyCost).toBeLessThanOrEqual(10);
      });
    });

    it('should have matching energy costs for equivalent custom pieces', () => {
      expect(PIECE_ENERGY_COSTS.twistedPawn).toBe(PIECE_ENERGY_COSTS.pawn);
      expect(PIECE_ENERGY_COSTS.prince).toBe(PIECE_ENERGY_COSTS.knight);
      expect(PIECE_ENERGY_COSTS.iceBishop).toBe(PIECE_ENERGY_COSTS.bishop);
      expect(PIECE_ENERGY_COSTS.flyingCastle).toBe(PIECE_ENERGY_COSTS.rook);
    });
  });

  describe('PIECE_POINT_VALUES', () => {
    it('should have point value for all piece types', () => {
      ALL_PIECE_TYPES.forEach(pieceType => {
        expect(PIECE_POINT_VALUES[pieceType]).toBeDefined();
        expect(typeof PIECE_POINT_VALUES[pieceType]).toBe('number');
      });
    });

    it('should have correct standard chess point values', () => {
      expect(PIECE_POINT_VALUES.pawn).toBe(1);
      expect(PIECE_POINT_VALUES.knight).toBe(3);
      expect(PIECE_POINT_VALUES.bishop).toBe(3);
      expect(PIECE_POINT_VALUES.rook).toBe(5);
      expect(PIECE_POINT_VALUES.queen).toBe(9);
      expect(PIECE_POINT_VALUES.king).toBe(0); // King has no point value
    });

    it('should have king point value as 0', () => {
      expect(PIECE_POINT_VALUES.king).toBe(0);
    });

    it('should have matching point values for equivalent custom pieces', () => {
      expect(PIECE_POINT_VALUES.twistedPawn).toBe(PIECE_POINT_VALUES.pawn);
      expect(PIECE_POINT_VALUES.pawnGeneral).toBe(PIECE_POINT_VALUES.pawn);
      expect(PIECE_POINT_VALUES.prince).toBe(PIECE_POINT_VALUES.knight);
      expect(PIECE_POINT_VALUES.iceBishop).toBe(PIECE_POINT_VALUES.bishop);
      expect(PIECE_POINT_VALUES.flyingCastle).toBe(PIECE_POINT_VALUES.rook);
    });
  });

  describe('Energy System Constants', () => {
    it('should have correct initial energy', () => {
      expect(INITIAL_ENERGY).toBe(6);
      expect(INITIAL_ENERGY).toBeGreaterThan(0);
      expect(INITIAL_ENERGY).toBeLessThanOrEqual(MAX_ENERGY);
    });

    it('should have correct max energy', () => {
      expect(MAX_ENERGY).toBe(25);
      expect(MAX_ENERGY).toBeGreaterThan(INITIAL_ENERGY);
    });

    it('should have correct initial energy regeneration rate', () => {
      expect(INITIAL_ENERGY_REGEN).toBe(0.5);
      expect(INITIAL_ENERGY_REGEN).toBeGreaterThan(0);
      expect(INITIAL_ENERGY_REGEN).toBeLessThanOrEqual(MAX_ENERGY_REGEN);
    });

    it('should have correct max energy regeneration rate', () => {
      expect(MAX_ENERGY_REGEN).toBe(10);
      expect(MAX_ENERGY_REGEN).toBeGreaterThan(INITIAL_ENERGY_REGEN);
    });

    it('should have correct energy regeneration increase', () => {
      expect(ENERGY_REGEN_INCREASE).toBe(0.5);
      expect(ENERGY_REGEN_INCREASE).toBeGreaterThan(0);
    });

    it('should have correct energy regeneration interval (15 seconds)', () => {
      expect(ENERGY_REGEN_INTERVAL).toBe(15000);
      expect(ENERGY_REGEN_INTERVAL).toBe(15 * 1000); // 15 seconds in milliseconds
    });
  });

  describe('Board Constants', () => {
    it('should have correct board size', () => {
      expect(BOARD_SIZE).toBe(8);
      expect(ROWS).toBe(8);
      expect(COLS).toBe(8);
      expect(ROWS).toBe(BOARD_SIZE);
      expect(COLS).toBe(BOARD_SIZE);
    });
  });
});

