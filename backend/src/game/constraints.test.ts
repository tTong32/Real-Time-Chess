import { describe, it, expect } from 'vitest';
import {
  PieceCategory,
  PIECE_CATEGORIES,
  STANDARD_BOARD_POSITIONS,
  canReplacePiece,
  isPawnType,
  isKingType,
  isNonPawnNonKingType,
  getReplaceablePieces,
  getPiecesByCategory,
  validateCustomBoard,
} from './constraints';
import type { PieceType } from './types';

describe('Piece Constraints', () => {
  describe('PIECE_CATEGORIES', () => {
    it('should categorize all pawn types as PAWN', () => {
      expect(PIECE_CATEGORIES.pawn).toBe(PieceCategory.PAWN);
      expect(PIECE_CATEGORIES.twistedPawn).toBe(PieceCategory.PAWN);
      expect(PIECE_CATEGORIES.pawnGeneral).toBe(PieceCategory.PAWN);
    });

    it('should categorize standard non-pawn, non-king pieces correctly', () => {
      expect(PIECE_CATEGORIES.knight).toBe(PieceCategory.NON_PAWN_NON_KING);
      expect(PIECE_CATEGORIES.bishop).toBe(PieceCategory.NON_PAWN_NON_KING);
      expect(PIECE_CATEGORIES.rook).toBe(PieceCategory.NON_PAWN_NON_KING);
      expect(PIECE_CATEGORIES.queen).toBe(PieceCategory.NON_PAWN_NON_KING);
    });

    it('should categorize custom non-pawn, non-king pieces correctly', () => {
      expect(PIECE_CATEGORIES.prince).toBe(PieceCategory.NON_PAWN_NON_KING);
      expect(PIECE_CATEGORIES.flyingCastle).toBe(PieceCategory.NON_PAWN_NON_KING);
      expect(PIECE_CATEGORIES.iceBishop).toBe(PieceCategory.NON_PAWN_NON_KING);
    });

    it('should categorize king as KING', () => {
      expect(PIECE_CATEGORIES.king).toBe(PieceCategory.KING);
    });

    it('should have a category for all piece types', () => {
      const allPieceTypes: PieceType[] = [
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

      allPieceTypes.forEach(pieceType => {
        expect(PIECE_CATEGORIES[pieceType]).toBeDefined();
        expect(Object.values(PieceCategory)).toContain(PIECE_CATEGORIES[pieceType]);
      });
    });
  });

  describe('canReplacePiece', () => {
    it('should allow pawn types to replace each other', () => {
      expect(canReplacePiece('pawn', 'twistedPawn')).toBe(true);
      expect(canReplacePiece('pawn', 'pawnGeneral')).toBe(true);
      expect(canReplacePiece('twistedPawn', 'pawn')).toBe(true);
      expect(canReplacePiece('twistedPawn', 'pawnGeneral')).toBe(true);
      expect(canReplacePiece('pawnGeneral', 'pawn')).toBe(true);
    });

    it('should allow non-pawn, non-king pieces to replace each other', () => {
      expect(canReplacePiece('knight', 'bishop')).toBe(true);
      expect(canReplacePiece('rook', 'queen')).toBe(true);
      expect(canReplacePiece('knight', 'prince')).toBe(true);
      expect(canReplacePiece('bishop', 'iceBishop')).toBe(true);
      expect(canReplacePiece('rook', 'flyingCastle')).toBe(true);
      expect(canReplacePiece('queen', 'prince')).toBe(true);
    });

    it('should allow king to replace king', () => {
      expect(canReplacePiece('king', 'king')).toBe(true);
    });

    it('should not allow pawn to replace non-pawn pieces', () => {
      expect(canReplacePiece('pawn', 'knight')).toBe(false);
      expect(canReplacePiece('pawn', 'king')).toBe(false);
      expect(canReplacePiece('pawn', 'queen')).toBe(false);
    });

    it('should not allow king to replace non-king pieces', () => {
      expect(canReplacePiece('king', 'pawn')).toBe(false);
      expect(canReplacePiece('king', 'knight')).toBe(false);
      expect(canReplacePiece('king', 'queen')).toBe(false);
    });

    it('should not allow non-pawn, non-king to replace pawns', () => {
      expect(canReplacePiece('knight', 'pawn')).toBe(false);
      expect(canReplacePiece('queen', 'pawn')).toBe(false);
      expect(canReplacePiece('prince', 'pawn')).toBe(false);
    });

    it('should not allow non-pawn, non-king to replace kings', () => {
      expect(canReplacePiece('knight', 'king')).toBe(false);
      expect(canReplacePiece('queen', 'king')).toBe(false);
      expect(canReplacePiece('prince', 'king')).toBe(false);
    });
  });

  describe('isPawnType', () => {
    it('should return true for pawn types', () => {
      expect(isPawnType('pawn')).toBe(true);
      expect(isPawnType('twistedPawn')).toBe(true);
      expect(isPawnType('pawnGeneral')).toBe(true);
    });

    it('should return false for non-pawn types', () => {
      expect(isPawnType('knight')).toBe(false);
      expect(isPawnType('king')).toBe(false);
      expect(isPawnType('queen')).toBe(false);
    });
  });

  describe('isKingType', () => {
    it('should return true for king', () => {
      expect(isKingType('king')).toBe(true);
    });

    it('should return false for non-king types', () => {
      expect(isKingType('pawn')).toBe(false);
      expect(isKingType('knight')).toBe(false);
      expect(isKingType('queen')).toBe(false);
    });
  });

  describe('isNonPawnNonKingType', () => {
    it('should return true for non-pawn, non-king pieces', () => {
      expect(isNonPawnNonKingType('knight')).toBe(true);
      expect(isNonPawnNonKingType('bishop')).toBe(true);
      expect(isNonPawnNonKingType('rook')).toBe(true);
      expect(isNonPawnNonKingType('queen')).toBe(true);
      expect(isNonPawnNonKingType('prince')).toBe(true);
      expect(isNonPawnNonKingType('flyingCastle')).toBe(true);
      expect(isNonPawnNonKingType('iceBishop')).toBe(true);
    });

    it('should return false for pawn and king types', () => {
      expect(isNonPawnNonKingType('pawn')).toBe(false);
      expect(isNonPawnNonKingType('twistedPawn')).toBe(false);
      expect(isNonPawnNonKingType('king')).toBe(false);
    });
  });

  describe('getReplaceablePieces', () => {
    it('should return all pawn types for pawn input', () => {
      const replaceable = getReplaceablePieces('pawn');
      expect(replaceable).toContain('pawn');
      expect(replaceable).toContain('twistedPawn');
      expect(replaceable).toContain('pawnGeneral');
      expect(replaceable.length).toBe(3);
    });

    it('should return all non-pawn, non-king types for knight input', () => {
      const replaceable = getReplaceablePieces('knight');
      expect(replaceable).toContain('knight');
      expect(replaceable).toContain('bishop');
      expect(replaceable).toContain('rook');
      expect(replaceable).toContain('queen');
      expect(replaceable).toContain('prince');
      expect(replaceable).toContain('flyingCastle');
      expect(replaceable).toContain('iceBishop');
      expect(replaceable.length).toBe(7);
    });

    it('should return king for king input', () => {
      const replaceable = getReplaceablePieces('king');
      expect(replaceable).toContain('king');
      expect(replaceable.length).toBe(1);
    });
  });

  describe('getPiecesByCategory', () => {
    it('should return all pawn types for PAWN category', () => {
      const pawns = getPiecesByCategory(PieceCategory.PAWN);
      expect(pawns).toContain('pawn');
      expect(pawns).toContain('twistedPawn');
      expect(pawns).toContain('pawnGeneral');
      expect(pawns.length).toBe(3);
    });

    it('should return all non-pawn, non-king types for NON_PAWN_NON_KING category', () => {
      const nonPawnNonKing = getPiecesByCategory(PieceCategory.NON_PAWN_NON_KING);
      expect(nonPawnNonKing.length).toBe(7);
      expect(nonPawnNonKing).toContain('knight');
      expect(nonPawnNonKing).toContain('bishop');
      expect(nonPawnNonKing).toContain('rook');
      expect(nonPawnNonKing).toContain('queen');
      expect(nonPawnNonKing).toContain('prince');
      expect(nonPawnNonKing).toContain('flyingCastle');
      expect(nonPawnNonKing).toContain('iceBishop');
    });

    it('should return king for KING category', () => {
      const kings = getPiecesByCategory(PieceCategory.KING);
      expect(kings).toContain('king');
      expect(kings.length).toBe(1);
    });
  });

  describe('validateCustomBoard', () => {
    it('should validate a valid empty board', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(true);
    });

    it('should reject board with wrong number of rows', () => {
      const board: (PieceType | null)[][] = Array(7).fill(null).map(() => Array(8).fill(null));
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject board with wrong number of columns', () => {
      const board: (PieceType | null)[][] = Array(8).fill(null).map(() => Array(7).fill(null));
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject invalid piece type', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][0] = 'invalidPiece' as PieceType;
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid piece type');
    });

    it('should validate king in correct position (row 0, col 4)', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][4] = 'king'; // White king in back row
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(true);
    });

    it('should validate king in correct position (row 7, col 4)', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[7][4] = 'king'; // Black king in back row
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(true);
    });

    it('should reject king in wrong column', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[0][0] = 'king'; // King in wrong column
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be in back row, column 4');
    });

    it('should reject king in wrong row', () => {
      const board: (PieceType | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[4][4] = 'king'; // King in middle of board
      const result = validateCustomBoard(board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be in back row, column 4');
    });
  });

  describe('STANDARD_BOARD_POSITIONS', () => {
    it('should have 8 pieces in front row', () => {
      expect(STANDARD_BOARD_POSITIONS.FRONT_ROW.length).toBe(8);
    });

    it('should have 8 pieces in back row', () => {
      expect(STANDARD_BOARD_POSITIONS.BACK_ROW.length).toBe(8);
    });

    it('should have king in column 4 (e-file)', () => {
      expect(STANDARD_BOARD_POSITIONS.KING_COLUMN).toBe(4);
    });
  });
});

