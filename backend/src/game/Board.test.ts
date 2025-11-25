import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board';
import type { Piece, PieceColor } from './types';
import { ROWS, COLS } from './constants';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  describe('constructor', () => {
    it('should create a board with default starting position', () => {
      const defaultBoard = new Board();
      expect(defaultBoard).toBeInstanceOf(Board);
      expect(defaultBoard.getSize()).toBe(8);
    });

    it('should create a board with custom initial configuration', () => {
      const customBoard: (Piece | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      customBoard[0][0] = {
        id: 'test-piece',
        type: 'pawn',
        color: 'white',
        row: 0,
        col: 0,
        hasMoved: false,
      };

      const board = new Board(customBoard);
      const piece = board.getPiece(0, 0);
      expect(piece).toBeDefined();
      expect(piece?.id).toBe('test-piece');
    });

    it('should throw error for invalid board row count', () => {
      const invalidBoard: (Piece | null)[][] = Array(7)
        .fill(null)
        .map(() => Array(8).fill(null));

      expect(() => new Board(invalidBoard)).toThrow();
    });

    it('should throw error for invalid board column count', () => {
      const invalidBoard: (Piece | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(7).fill(null));

      expect(() => new Board(invalidBoard)).toThrow();
    });

    it('should create deep copy of initial board', () => {
      const piece: Piece = {
        id: 'original',
        type: 'pawn',
        color: 'white',
        row: 0,
        col: 0,
        hasMoved: false,
      };
      const customBoard: (Piece | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      customBoard[0][0] = piece;

      const board = new Board(customBoard);
      const retrievedPiece = board.getPiece(0, 0);
      
      // Modify original piece
      piece.hasMoved = true;
      
      // Board should have a copy, so it shouldn't be affected
      expect(retrievedPiece?.hasMoved).toBe(false);
    });
  });

  describe('createDefaultBoard', () => {
    it('should have correct board dimensions', () => {
      const boardState = board.getBoard();
      expect(boardState.length).toBe(ROWS);
      boardState.forEach(row => {
        expect(row.length).toBe(COLS);
      });
    });

    it('should place white pieces on rows 6-7', () => {
      // Check white back rank (row 7)
      expect(board.getPiece(7, 0)?.type).toBe('rook');
      expect(board.getPiece(7, 1)?.type).toBe('knight');
      expect(board.getPiece(7, 2)?.type).toBe('bishop');
      expect(board.getPiece(7, 3)?.type).toBe('queen');
      expect(board.getPiece(7, 4)?.type).toBe('king');
      expect(board.getPiece(7, 5)?.type).toBe('bishop');
      expect(board.getPiece(7, 6)?.type).toBe('knight');
      expect(board.getPiece(7, 7)?.type).toBe('rook');

      // Check white pawns (row 6)
      for (let col = 0; col < COLS; col++) {
        const piece = board.getPiece(6, col);
        expect(piece?.type).toBe('pawn');
        expect(piece?.color).toBe('white');
      }
    });

    it('should place black pieces on rows 0-1', () => {
      // Check black back rank (row 0)
      expect(board.getPiece(0, 0)?.type).toBe('rook');
      expect(board.getPiece(0, 1)?.type).toBe('knight');
      expect(board.getPiece(0, 2)?.type).toBe('bishop');
      expect(board.getPiece(0, 3)?.type).toBe('queen');
      expect(board.getPiece(0, 4)?.type).toBe('king');
      expect(board.getPiece(0, 5)?.type).toBe('bishop');
      expect(board.getPiece(0, 6)?.type).toBe('knight');
      expect(board.getPiece(0, 7)?.type).toBe('rook');

      // Check black pawns (row 1)
      for (let col = 0; col < COLS; col++) {
        const piece = board.getPiece(1, col);
        expect(piece?.type).toBe('pawn');
        expect(piece?.color).toBe('black');
      }
    });

    it('should have empty squares in middle rows (2-5)', () => {
      for (let row = 2; row <= 5; row++) {
        for (let col = 0; col < COLS; col++) {
          expect(board.getPiece(row, col)).toBeNull();
        }
      }
    });

    it('should have correct piece colors', () => {
      // White pieces
      for (let row = 6; row <= 7; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = board.getPiece(row, col);
          if (piece) {
            expect(piece.color).toBe('white');
          }
        }
      }

      // Black pieces
      for (let row = 0; row <= 1; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = board.getPiece(row, col);
          if (piece) {
            expect(piece.color).toBe('black');
          }
        }
      }
    });

    it('should have unique piece IDs', () => {
      const pieceIds = new Set<string>();
      
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = board.getPiece(row, col);
          if (piece) {
            expect(pieceIds.has(piece.id)).toBe(false);
            pieceIds.add(piece.id);
          }
        }
      }
    });

    it('should have all pieces with hasMoved = false initially', () => {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const piece = board.getPiece(row, col);
          if (piece) {
            expect(piece.hasMoved).toBe(false);
          }
        }
      }
    });
  });

  describe('getPiece', () => {
    it('should return piece at valid position', () => {
      const piece = board.getPiece(7, 0);
      expect(piece).toBeDefined();
      expect(piece?.type).toBe('rook');
      expect(piece?.color).toBe('white');
    });

    it('should return null for empty square', () => {
      const piece = board.getPiece(4, 4);
      expect(piece).toBeNull();
    });

    it('should return null for invalid row (negative)', () => {
      const piece = board.getPiece(-1, 0);
      expect(piece).toBeNull();
    });

    it('should return null for invalid row (too large)', () => {
      const piece = board.getPiece(8, 0);
      expect(piece).toBeNull();
    });

    it('should return null for invalid col (negative)', () => {
      const piece = board.getPiece(0, -1);
      expect(piece).toBeNull();
    });

    it('should return null for invalid col (too large)', () => {
      const piece = board.getPiece(0, 8);
      expect(piece).toBeNull();
    });
  });

  describe('setPiece', () => {
    it('should set piece at valid position', () => {
      const newPiece: Piece = {
        id: 'test-piece-1',
        type: 'knight',
        color: 'white',
        row: 4,
        col: 4,
        hasMoved: false,
      };

      board.setPiece(4, 4, newPiece);
      const retrievedPiece = board.getPiece(4, 4);
      
      expect(retrievedPiece).toBeDefined();
      expect(retrievedPiece?.id).toBe('test-piece-1');
      expect(retrievedPiece?.type).toBe('knight');
      expect(retrievedPiece?.row).toBe(4);
      expect(retrievedPiece?.col).toBe(4);
    });

    it('should update piece position when setting', () => {
      const piece: Piece = {
        id: 'test-piece-2',
        type: 'pawn',
        color: 'white',
        row: 0,
        col: 0,
        hasMoved: false,
      };

      board.setPiece(5, 5, piece);
      const retrievedPiece = board.getPiece(5, 5);
      
      expect(retrievedPiece?.row).toBe(5);
      expect(retrievedPiece?.col).toBe(5);
    });

    it('should clear piece when setting to null', () => {
      // Move a piece to an empty square first
      const piece = board.getPiece(7, 0);
      expect(piece).toBeDefined();

      board.setPiece(7, 0, null);
      expect(board.getPiece(7, 0)).toBeNull();
    });

    it('should not set piece at invalid position', () => {
      const piece: Piece = {
        id: 'test-piece-3',
        type: 'pawn',
        color: 'white',
        row: -1,
        col: -1,
        hasMoved: false,
      };

      board.setPiece(-1, -1, piece);
      expect(board.getPiece(-1, -1)).toBeNull();
    });

    it('should create a copy of the piece when setting', () => {
      const piece: Piece = {
        id: 'test-piece-4',
        type: 'pawn',
        color: 'white',
        row: 0,
        col: 0,
        hasMoved: false,
      };

      board.setPiece(4, 4, piece);
      
      // Modify original piece
      piece.hasMoved = true;
      
      // Board should have a copy
      const retrievedPiece = board.getPiece(4, 4);
      expect(retrievedPiece?.hasMoved).toBe(false);
    });
  });

  describe('isValidPosition', () => {
    it('should return true for valid positions', () => {
      expect(board.isValidPosition(0, 0)).toBe(true);
      expect(board.isValidPosition(7, 7)).toBe(true);
      expect(board.isValidPosition(4, 4)).toBe(true);
    });

    it('should return false for invalid row (negative)', () => {
      expect(board.isValidPosition(-1, 0)).toBe(false);
    });

    it('should return false for invalid row (too large)', () => {
      expect(board.isValidPosition(8, 0)).toBe(false);
    });

    it('should return false for invalid col (negative)', () => {
      expect(board.isValidPosition(0, -1)).toBe(false);
    });

    it('should return false for invalid col (too large)', () => {
      expect(board.isValidPosition(0, 8)).toBe(false);
    });
  });

  describe('getBoard', () => {
    it('should return a copy of the board', () => {
      const boardCopy = board.getBoard();
      
      expect(boardCopy).toHaveLength(ROWS);
      boardCopy.forEach(row => {
        expect(row).toHaveLength(COLS);
      });

      // Modify the copy
      boardCopy[0][0] = null;
      
      // Original board should not be affected
      expect(board.getPiece(0, 0)).not.toBeNull();
    });

    it('should return deep copy of pieces', () => {
      const boardCopy = board.getBoard();
      const piece = boardCopy[7][0];
      
      if (piece) {
        piece.hasMoved = true;
        
        // Original piece should not be affected
        const originalPiece = board.getPiece(7, 0);
        expect(originalPiece?.hasMoved).toBe(false);
      }
    });
  });

  describe('clone', () => {
    it('should create a new Board instance', () => {
      const clonedBoard = board.clone();
      expect(clonedBoard).toBeInstanceOf(Board);
      expect(clonedBoard).not.toBe(board);
    });

    it('should have the same pieces as original', () => {
      const clonedBoard = board.clone();
      
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const originalPiece = board.getPiece(row, col);
          const clonedPiece = clonedBoard.getPiece(row, col);
          
          if (originalPiece === null) {
            expect(clonedPiece).toBeNull();
          } else {
            expect(clonedPiece).toBeDefined();
            expect(clonedPiece?.id).toBe(originalPiece.id);
            expect(clonedPiece?.type).toBe(originalPiece.type);
            expect(clonedPiece?.color).toBe(originalPiece.color);
          }
        }
      }
    });

    it('should create independent copies', () => {
      const clonedBoard = board.clone();
      
      // Modify original
      board.setPiece(4, 4, {
        id: 'new-piece',
        type: 'pawn',
        color: 'white',
        row: 4,
        col: 4,
        hasMoved: false,
      });
      
      // Clone should not be affected
      expect(clonedBoard.getPiece(4, 4)).toBeNull();
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty square', () => {
      expect(board.isEmpty(4, 4)).toBe(true);
    });

    it('should return false for occupied square', () => {
      expect(board.isEmpty(7, 0)).toBe(false);
    });

    it('should return false for invalid position', () => {
      expect(board.isEmpty(-1, -1)).toBe(false);
    });
  });

  describe('findPiecesByColor', () => {
    it('should find all white pieces', () => {
      const whitePieces = board.findPiecesByColor('white');
      expect(whitePieces.length).toBe(16); // 8 pawns + 8 back rank pieces
      
      whitePieces.forEach(piece => {
        expect(piece.color).toBe('white');
      });
    });

    it('should find all black pieces', () => {
      const blackPieces = board.findPiecesByColor('black');
      expect(blackPieces.length).toBe(16); // 8 pawns + 8 back rank pieces
      
      blackPieces.forEach(piece => {
        expect(piece.color).toBe('black');
      });
    });

    it('should return empty array after clearing board', () => {
      board.clear();
      const whitePieces = board.findPiecesByColor('white');
      expect(whitePieces).toHaveLength(0);
    });
  });

  describe('findPieceById', () => {
    it('should find piece by ID', () => {
      const whiteRook = board.getPiece(7, 0);
      expect(whiteRook).toBeDefined();
      
      const foundPiece = board.findPieceById(whiteRook!.id);
      expect(foundPiece).toBeDefined();
      expect(foundPiece?.id).toBe(whiteRook!.id);
      expect(foundPiece?.row).toBe(7);
      expect(foundPiece?.col).toBe(0);
    });

    it('should return null for non-existent ID', () => {
      const piece = board.findPieceById('non-existent-id');
      expect(piece).toBeNull();
    });
  });

  describe('movePiece', () => {
    it('should move piece from source to destination', () => {
      const sourcePiece = board.getPiece(7, 0);
      expect(sourcePiece).toBeDefined();
      
      const success = board.movePiece(7, 0, 4, 4);
      
      expect(success).toBe(true);
      expect(board.getPiece(7, 0)).toBeNull();
      expect(board.getPiece(4, 4)).toBeDefined();
      expect(board.getPiece(4, 4)?.id).toBe(sourcePiece!.id);
    });

    it('should update piece position and hasMoved flag', () => {
      const sourcePiece = board.getPiece(6, 0);
      expect(sourcePiece?.hasMoved).toBe(false);
      
      board.movePiece(6, 0, 5, 0);
      
      const movedPiece = board.getPiece(5, 0);
      expect(movedPiece?.hasMoved).toBe(true);
      expect(movedPiece?.row).toBe(5);
      expect(movedPiece?.col).toBe(0);
    });

    it('should return false if source is empty', () => {
      const success = board.movePiece(4, 4, 5, 5);
      expect(success).toBe(false);
    });

    it('should capture piece at destination', () => {
      // Move white pawn forward
      board.movePiece(6, 0, 5, 0);
      
      // Move black pawn forward
      board.movePiece(1, 0, 2, 0);
      
      // Move white pawn diagonally to capture black pawn
      const whitePawn = board.getPiece(5, 0);
      expect(whitePawn?.color).toBe('white');
      
      // Capture: move white pawn diagonally to where black pawn is
      board.movePiece(5, 0, 2, 0);
      
      // The piece at destination should now be white (captured black)
      const capturedPiece = board.getPiece(2, 0);
      expect(capturedPiece?.color).toBe('white');
    });

    it('should not move piece if source is invalid', () => {
      const success = board.movePiece(-1, -1, 4, 4);
      expect(success).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all pieces from board', () => {
      expect(board.getPiece(7, 0)).toBeDefined();
      
      board.clear();
      
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          expect(board.getPiece(row, col)).toBeNull();
        }
      }
    });
  });

  describe('getSize', () => {
    it('should return board size of 8', () => {
      expect(board.getSize()).toBe(8);
    });
  });
});

