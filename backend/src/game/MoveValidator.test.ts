import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from './Board';
import { MoveValidator } from './MoveValidator';
import type { Piece, PieceColor, PlayerState, MoveAttempt } from './types';
import { PIECE_COOLDOWNS, PIECE_ENERGY_COSTS, INITIAL_ENERGY } from './constants';

describe('MoveValidator', () => {
  let board: Board;
  let validator: MoveValidator;
  let whitePlayerState: PlayerState;
  let blackPlayerState: PlayerState;
  let currentTime: number;

  beforeEach(() => {
    board = new Board();
    validator = new MoveValidator(board);
    currentTime = Date.now();
    
    whitePlayerState = {
      energy: INITIAL_ENERGY,
      energyRegenRate: 0.5,
      lastEnergyUpdate: currentTime,
      pieceCooldowns: new Map(),
    };

    blackPlayerState = {
      energy: INITIAL_ENERGY,
      energyRegenRate: 0.5,
      lastEnergyUpdate: currentTime,
      pieceCooldowns: new Map(),
    };
  });

  describe('validateMove - General validation', () => {
    it('should reject move from empty square', () => {
      const move: MoveAttempt = {
        fromRow: 4,
        fromCol: 4,
        toRow: 5,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid piece');
    });

    it('should reject move with wrong player color', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 6,
        toCol: 0,
        playerId: 'player2',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'black', blackPlayerState, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid piece');
    });

    it('should reject move when piece is on cooldown', () => {
      const whiteRook = board.getPiece(7, 0)!;
      const cooldownEnd = currentTime + PIECE_COOLDOWNS.rook * 1000 + 1000;
      whitePlayerState.pieceCooldowns.set(whiteRook.id, cooldownEnd);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Piece on cooldown');
    });

    it('should reject move with insufficient energy', () => {
      whitePlayerState.energy = 1; // Less than queen energy cost (8)

      const whiteQueen = board.getPiece(7, 3)!;
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 5,
        toCol: 5,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Insufficient energy');
    });

    it('should accept valid move', () => {
      // Clear pieces in the way for rook to move (and destination since queen is same color)
      board.setPiece(7, 1, null);
      board.setPiece(7, 2, null);
      board.setPiece(7, 3, null); // Clear queen at destination

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });
  });

  describe('Pawn moves', () => {
    it('should allow pawn to move forward one square', () => {
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow pawn to move forward two squares from start', () => {
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 4,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow pawn to move forward into occupied square', () => {
      // Place a piece in front of the pawn
      board.setPiece(5, 0, {
        id: 'blocker',
        type: 'pawn',
        color: 'white',
        row: 5,
        col: 0,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should allow pawn to capture diagonally', () => {
      // Place an enemy piece diagonally
      board.setPiece(5, 1, {
        id: 'enemy',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 1,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 1,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow pawn to move forward into enemy piece', () => {
      // Place an enemy piece in front
      board.setPiece(5, 0, {
        id: 'enemy',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 0,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should not allow pawn to capture own piece', () => {
      // Place own piece diagonally
      board.setPiece(5, 1, {
        id: 'friendly',
        type: 'pawn',
        color: 'white',
        row: 5,
        col: 1,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 1,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('Knight moves', () => {
    it('should allow knight to move in L-shape', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 1,
        toRow: 5,
        toCol: 2,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow knight to jump over pieces', () => {
      // Knight should be able to jump over the pawn in front
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 1,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow invalid knight move', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 1,
        toRow: 7,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('Bishop moves', () => {
    it('should allow bishop to move diagonally', () => {
      // Clear path for bishop (pawn in front)
      board.setPiece(6, 2, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 2,
        toRow: 5,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow bishop to move through pieces', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 2,
        toRow: 4,
        toCol: 5,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should allow bishop to capture enemy piece', () => {
      // Clear path and place enemy piece
      board.setPiece(6, 2, null);
      // Clear any piece that might be at destination
      board.setPiece(5, 4, {
        id: 'enemy',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 4,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 2,
        toRow: 5,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow bishop to move horizontally', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 2,
        toRow: 7,
        toCol: 5,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('Rook moves', () => {
    it('should allow rook to move horizontally', () => {
      // Clear pieces in the way and destination
      board.setPiece(7, 1, null);
      board.setPiece(7, 2, null);
      board.setPiece(7, 3, null); // Clear queen at destination

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow rook to move vertically', () => {
      // Clear path for rook
      board.setPiece(6, 0, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow rook to move through pieces', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 7,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should not allow rook to move diagonally', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 5,
        toCol: 2,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('Queen moves', () => {
    it('should allow queen to move diagonally', () => {
      // Clear path for queen
      board.setPiece(6, 3, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 5,
        toCol: 5,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow queen to move horizontally', () => {
      // Clear pieces in the way and destination
      board.setPiece(7, 4, null); // Clear king
      board.setPiece(7, 5, null); // Clear bishop at destination

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 7,
        toCol: 5,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow queen to move vertically', () => {
      // Clear path for queen
      board.setPiece(6, 3, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 5,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow queen to move through pieces', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 4,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('King moves', () => {
    it('should allow king to move one square in any direction', () => {
      // Clear path for king
      board.setPiece(6, 4, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 4,
        toRow: 6,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should allow king to move diagonally one square', () => {
      // Clear path for king
      board.setPiece(6, 3, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 4,
        toRow: 6,
        toCol: 3,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });

    it('should not allow king to move more than one square', () => {
      // Clear path for king
      board.setPiece(6, 4, null);

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 4,
        toRow: 5,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should not allow king to stay in place', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 4,
        toRow: 7,
        toCol: 4,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });

  describe('Custom pieces', () => {
    describe('Twisted Pawn', () => {
      it('should allow twisted pawn to move diagonally forward', () => {
        const twistedPawn: Piece = {
          id: 'twisted-pawn-1',
          type: 'twistedPawn',
          color: 'white',
          row: 6,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(6, 0, twistedPawn);

        const move: MoveAttempt = {
          fromRow: 6,
          fromCol: 0,
          toRow: 5,
          toCol: 1,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });

      it('should allow twisted pawn to capture straight forward', () => {
        const twistedPawn: Piece = {
          id: 'twisted-pawn-2',
          type: 'twistedPawn',
          color: 'white',
          row: 6,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(6, 0, twistedPawn);

        // Place enemy piece straight ahead
        board.setPiece(5, 0, {
          id: 'enemy',
          type: 'pawn',
          color: 'black',
          row: 5,
          col: 0,
          hasMoved: false,
        });

        const move: MoveAttempt = {
          fromRow: 6,
          fromCol: 0,
          toRow: 5,
          toCol: 0,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });

      it('should not allow twisted pawn to capture diagonally', () => {
        const twistedPawn: Piece = {
          id: 'twisted-pawn-3',
          type: 'twistedPawn',
          color: 'white',
          row: 6,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(6, 0, twistedPawn);

        // Place enemy piece diagonally
        board.setPiece(5, 1, {
          id: 'enemy',
          type: 'pawn',
          color: 'black',
          row: 5,
          col: 1,
          hasMoved: false,
        });

        const move: MoveAttempt = {
          fromRow: 6,
          fromCol: 0,
          toRow: 5,
          toCol: 1,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(false);
      });
    });

    describe('Flying Castle', () => {
      it('should allow flying castle to move like a rook', () => {
        const flyingCastle: Piece = {
          id: 'flying-castle-1',
          type: 'flyingCastle',
          color: 'white',
          row: 7,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(7, 0, flyingCastle);
        // Clear pieces in the way (flying castle can jump over one)
        board.setPiece(7, 1, null);
        board.setPiece(7, 2, null);

        const move: MoveAttempt = {
          fromRow: 7,
          fromCol: 0,
          toRow: 7,
          toCol: 3,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });

      it('should allow flying castle to jump over one piece', () => {
        const flyingCastle: Piece = {
          id: 'flying-castle-2',
          type: 'flyingCastle',
          color: 'white',
          row: 7,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(7, 0, flyingCastle);

        // Place a piece in the way (the pawn at 6,0)
        // Flying castle should be able to jump over it

        const move: MoveAttempt = {
          fromRow: 7,
          fromCol: 0,
          toRow: 5,
          toCol: 0,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });

      it('should not allow flying castle to jump over multiple pieces', () => {
        const flyingCastle: Piece = {
          id: 'flying-castle-3',
          type: 'flyingCastle',
          color: 'white',
          row: 7,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(7, 0, flyingCastle);

        // Place two pieces in the way
        board.setPiece(5, 0, {
          id: 'blocker2',
          type: 'pawn',
          color: 'white',
          row: 5,
          col: 0,
          hasMoved: false,
        });

        const move: MoveAttempt = {
          fromRow: 7,
          fromCol: 0,
          toRow: 4,
          toCol: 0,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(false);
      });
    });

    describe('Prince', () => {
      it('should allow prince to move like a knight', () => {
        const prince: Piece = {
          id: 'prince-1',
          type: 'prince',
          color: 'white',
          row: 7,
          col: 1,
          hasMoved: false,
          canPreventCapture: true,
        };
        board.setPiece(7, 1, prince);

        const move: MoveAttempt = {
          fromRow: 7,
          fromCol: 1,
          toRow: 5,
          toCol: 2,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });
    });

    describe('Ice Bishop', () => {
      it('should allow ice bishop to move like a standard bishop', () => {
        const iceBishop: Piece = {
          id: 'ice-bishop-1',
          type: 'iceBishop',
          color: 'white',
          row: 7,
          col: 2,
          hasMoved: false,
        };
        board.setPiece(7, 2, iceBishop);
        board.setPiece(6, 2, null); // Clear path

        const move: MoveAttempt = {
          fromRow: 7,
          fromCol: 2,
          toRow: 5,
          toCol: 4,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });
    });

    describe('Pawn General', () => {
      it('should allow pawn general to move like a standard pawn', () => {
        const pawnGeneral: Piece = {
          id: 'pawn-general-1',
          type: 'pawnGeneral',
          color: 'white',
          row: 6,
          col: 0,
          hasMoved: false,
        };
        board.setPiece(6, 0, pawnGeneral);

        const move: MoveAttempt = {
          fromRow: 6,
          fromCol: 0,
          toRow: 5,
          toCol: 0,
          playerId: 'player1',
          timestamp: currentTime,
        };

        const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Path validation', () => {
    it('should prevent moving through own pieces', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 7,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should prevent moving through enemy pieces', () => {
      // Clear some pieces to create a path with enemy piece
      board.setPiece(6, 0, null);
      board.setPiece(5, 0, {
        id: 'enemy',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 0,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 4,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should allow capturing enemy piece at destination', () => {
      // Clear path and place enemy piece at destination
      board.setPiece(6, 0, null);
      board.setPiece(5, 0, {
        id: 'enemy',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 0,
        hasMoved: false,
      });

      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should reject moves to invalid board positions', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: -1,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });

    it('should reject moves from invalid board positions', () => {
      const move: MoveAttempt = {
        fromRow: -1,
        fromCol: 0,
        toRow: 7,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid piece');
    });

    it('should reject moving to same position', () => {
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 0,
        toRow: 7,
        toCol: 0,
        playerId: 'player1',
        timestamp: currentTime,
      };

      const result = validator.validateMove(move, 'white', whitePlayerState, currentTime);
      expect(result.valid).toBe(false);
    });
  });
});

