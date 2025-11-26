import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './GameEngine';
import type { GameState, MoveAttempt, Piece, PieceColor } from './types';
import { INITIAL_ENERGY, INITIAL_ENERGY_REGEN, PIECE_ENERGY_COSTS, PIECE_POINT_VALUES } from './constants';

describe('GameEngine', () => {
  let baseGameState: GameState;
  let baseTime: number;
  const whitePlayerId = 'white-player-1';
  const blackPlayerId = 'black-player-1';

  beforeEach(() => {
    baseTime = 1000000;
    baseGameState = {
      id: 'game-1',
      board: Array(8)
        .fill(null)
        .map(() => Array(8).fill(null)),
      whiteState: {
        energy: INITIAL_ENERGY,
        energyRegenRate: INITIAL_ENERGY_REGEN,
        lastEnergyUpdate: baseTime,
        pieceCooldowns: new Map(),
      },
      blackState: {
        energy: INITIAL_ENERGY,
        energyRegenRate: INITIAL_ENERGY_REGEN,
        lastEnergyUpdate: baseTime,
        pieceCooldowns: new Map(),
      },
      whitePlayerId,
      blackPlayerId,
      currentTurn: null,
      status: 'active',
      winner: null,
      startedAt: baseTime,
      lastMoveAt: null,
    };
  });

  describe('constructor', () => {
    it('should initialize with game state', () => {
      const engine = new GameEngine(baseGameState);
      const state = engine.getState();
      expect(state.id).toBe('game-1');
      expect(state.status).toBe('active');
    });
  });

  describe('attemptMove', () => {
    it('should reject move for unknown player', () => {
      const engine = new GameEngine(baseGameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: 'unknown-player',
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Player not in game');
    });

    it('should reject invalid move', () => {
      // Set up a board with a white pawn that has already moved
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[5][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 5,
        col: 0,
        hasMoved: true, // Already moved
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 5,
        fromCol: 0,
        toRow: 3,
        toCol: 0, // Invalid: pawn can't move 2 squares if it has moved
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should successfully execute valid move', () => {
      // Set up a board with a white pawn
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(true);
      expect(result.newState).toBeDefined();

      const newState = result.newState!;
      expect(newState.board[6][0]).toBeNull();
      expect(newState.board[5][0]).toBeDefined();
      expect(newState.board[5][0]?.type).toBe('pawn');
    });
  });

  describe('executeMove - normal moves', () => {
    it('should move piece and consume energy', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
        whiteState: {
          ...baseGameState.whiteState,
          energy: 10,
        },
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(true);

      const newState = result.newState!;
      const newWhiteState = newState.whiteState;
      expect(newWhiteState.energy).toBeLessThan(10); // Energy consumed
    });

    it('should set cooldown after move', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 0,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      engine.attemptMove(move, baseTime);
      const state = engine.getState();
      const cooldownEnd = state.whiteState.pieceCooldowns.get('white-pawn-1');
      expect(cooldownEnd).toBeDefined();
      expect(cooldownEnd).toBeGreaterThan(baseTime);
    });
  });

  describe('executeMove - captures', () => {
    it('should capture enemy piece', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };
      board[5][1] = {
        id: 'black-pawn-1',
        type: 'pawn',
        color: 'black',
        row: 5,
        col: 1,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 1, // Capture black pawn
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(true);

      const newState = result.newState!;
      expect(newState.board[5][1]?.color).toBe('white');
      expect(newState.board[5][1]?.id).toBe('white-pawn-1');
    });

    it('should detect king capture and set winner', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };
      board[5][1] = {
        id: 'black-king-1',
        type: 'king',
        color: 'black',
        row: 5,
        col: 1,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 1, // Capture black king
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(true);

      const newState = result.newState!;
      expect(newState.status).toBe('finished');
      expect(newState.winner).toBe('white');
    });
  });

  describe('executeMove - Prince capture prevention', () => {
    it('should prevent capture when Prince uses ability', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };
      board[5][1] = {
        id: 'black-prince-1',
        type: 'prince',
        color: 'black',
        row: 5,
        col: 1,
        hasMoved: false,
        canPreventCapture: true,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 6,
        fromCol: 0,
        toRow: 5,
        toCol: 1,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(true);

      const newState = result.newState!;
      // When Prince prevents capture, ability is consumed and both pieces stay at original position
      // (the moving piece does not take the square)
      const pieceAtSquare = newState.board[5][1];
      const originalPieceAtSquare = newState.board[6][0];
      expect(pieceAtSquare).toBeDefined();
      expect(pieceAtSquare?.type).toBe('prince'); // Prince should still be there
      expect(pieceAtSquare?.id).toBe('black-prince-1');
      expect(originalPieceAtSquare).toBeDefined();
      expect(originalPieceAtSquare?.type).toBe('pawn'); // Prince should still be there
      expect(originalPieceAtSquare?.id).toBe('white-pawn-1');
    });
  });

  describe('special effects', () => {
    it('should apply Pawn General effect to adjacent friendly pieces', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[4][4] = {
        id: 'white-pawn-general-1',
        type: 'pawnGeneral',
        color: 'white',
        row: 4,
        col: 4,
        hasMoved: false,
      };
      board[4][3] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 4,
        col: 3,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
        whiteState: {
          ...baseGameState.whiteState,
          pieceCooldowns: new Map([
            ['white-pawn-1', baseTime + 5000], // 5 seconds remaining
          ]),
        },
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 4,
        fromCol: 4,
        toRow: 3,
        toCol: 4,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      engine.attemptMove(move, baseTime);
      const state = engine.getState();
      const newCooldown = state.whiteState.pieceCooldowns.get('white-pawn-1');
      expect(newCooldown).toBeDefined();
      // Should be reduced by 2000ms
      expect(newCooldown).toBeLessThan(baseTime + 5000);
      expect(newCooldown).toBe(baseTime + 3000);
    });

    it('should apply Ice Bishop effect to adjacent enemy pieces', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[4][4] = {
        id: 'white-ice-bishop-1',
        type: 'iceBishop',
        color: 'white',
        row: 4,
        col: 4,
        hasMoved: false,
      };
      board[3][4] = {
        id: 'black-pawn-1',
        type: 'pawn',
        color: 'black',
        row: 3,
        col: 4,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 4,
        fromCol: 4,
        toRow: 3,
        toCol: 3, // Valid diagonal move to empty square, black-pawn-1 at [3,4] is adjacent
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      engine.attemptMove(move, baseTime);
      const state = engine.getState();
      const cooldown = state.blackState.pieceCooldowns.get('black-pawn-1');
      expect(cooldown).toBeDefined();
      // Should be set to 3 seconds (3000ms)
      expect(cooldown).toBe(baseTime + 3000);
    });

    it('should cap Ice Bishop effect at max cooldown', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[4][4] = {
        id: 'white-ice-bishop-1',
        type: 'iceBishop',
        color: 'white',
        row: 4,
        col: 4,
        hasMoved: false,
      };
      board[3][4] = {
        id: 'black-pawn-1',
        type: 'pawn',
        color: 'black',
        row: 3,
        col: 4,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
        blackState: {
          ...baseGameState.blackState,
          pieceCooldowns: new Map([
            ['black-pawn-1', baseTime + 2000], // Already on cooldown with 2 seconds remaining
          ]),
        },
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 4,
        fromCol: 4,
        toRow: 3,
        toCol: 3, // Move diagonally to empty square, black-pawn-1 at [3,4] is adjacent
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      engine.attemptMove(move, baseTime);
      const state = engine.getState();
      const cooldown = state.blackState.pieceCooldowns.get('black-pawn-1');
      // Should add 3 seconds to remaining 2 seconds = 5 seconds, but cap at max (pawn cooldown is 4 seconds = 4000ms)
      // getRemainingCooldown returns 2000, we add 3000 to get 5000, but max is 4000
      // So: currentTime + Math.min(2000 + 3000, 4000) = currentTime + 4000
      expect(cooldown).toBe(baseTime + 4000); // Capped at max
    });
  });

  describe('calculatePlayerPoints', () => {
    it('should calculate points for all pieces on board', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[7][0] = {
        id: 'white-rook-1',
        type: 'rook',
        color: 'white',
        row: 7,
        col: 0,
        hasMoved: false,
      };
      board[7][1] = {
        id: 'white-knight-1',
        type: 'knight',
        color: 'white',
        row: 7,
        col: 1,
        hasMoved: false,
      };
      board[6][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 6,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const points = engine.calculatePlayerPoints('white');
      // Rook (5) + Knight (3) + Pawn (1) = 9
      expect(points).toBe(9);
    });

    it('should return 0 for player with no pieces', () => {
      const engine = new GameEngine(baseGameState);
      const points = engine.calculatePlayerPoints('white');
      expect(points).toBe(0);
    });
  });

  describe('checkSimultaneousKingCapture', () => {
    it('should return null when no kings captured', () => {
      const engine = new GameEngine(baseGameState);
      const winner = engine.checkSimultaneousKingCapture(false, false);
      expect(winner).toBeNull();
    });

    it('should return white when only white captures king', () => {
      const engine = new GameEngine(baseGameState);
      const winner = engine.checkSimultaneousKingCapture(true, false);
      expect(winner).toBe('white');
    });

    it('should return black when only black captures king', () => {
      const engine = new GameEngine(baseGameState);
      const winner = engine.checkSimultaneousKingCapture(false, true);
      expect(winner).toBe('black');
    });

    it('should use points to determine winner when both kings captured', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      // White has more pieces
      board[7][0] = {
        id: 'white-queen-1',
        type: 'queen',
        color: 'white',
        row: 7,
        col: 0,
        hasMoved: false,
      };
      board[0][0] = {
        id: 'black-pawn-1',
        type: 'pawn',
        color: 'black',
        row: 0,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const winner = engine.checkSimultaneousKingCapture(true, true);
      expect(winner).toBe('white'); // White has more points (9 vs 1)
    });

    it('should give tie to white when points are equal', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[7][0] = {
        id: 'white-pawn-1',
        type: 'pawn',
        color: 'white',
        row: 7,
        col: 0,
        hasMoved: false,
      };
      board[0][0] = {
        id: 'black-pawn-1',
        type: 'pawn',
        color: 'black',
        row: 0,
        col: 0,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
      };

      const engine = new GameEngine(gameState);
      const winner = engine.checkSimultaneousKingCapture(true, true);
      expect(winner).toBe('white'); // Tie goes to white
    });
  });

  describe('getState', () => {
    it('should return current game state with updated board', () => {
      const engine = new GameEngine(baseGameState);
      const state = engine.getState();
      expect(state.id).toBe('game-1');
      expect(state.board).toBeDefined();
      expect(Array.isArray(state.board)).toBe(true);
    });
  });

  describe('updateState', () => {
    it('should update both player states', () => {
      const engine = new GameEngine(baseGameState);
      const laterTime = baseTime + 2000; // 2 seconds later

      engine.updateState(laterTime);
      const state = engine.getState();

      // Energy should have regenerated
      expect(state.whiteState.energy).toBeGreaterThan(INITIAL_ENERGY);
      expect(state.blackState.energy).toBeGreaterThan(INITIAL_ENERGY);
    });

    it('should not update if game has not started', () => {
      const gameState: GameState = {
        ...baseGameState,
        startedAt: null,
      };

      const engine = new GameEngine(gameState);
      const laterTime = baseTime + 2000;

      engine.updateState(laterTime);
      const state = engine.getState();

      // Energy should not have changed
      expect(state.whiteState.energy).toBe(INITIAL_ENERGY);
      expect(state.blackState.energy).toBe(INITIAL_ENERGY);
    });
  });

  describe('energy consumption', () => {
    it('should fail move if insufficient energy', () => {
      const board = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      board[7][3] = {
        id: 'white-queen-1',
        type: 'queen',
        color: 'white',
        row: 7,
        col: 3,
        hasMoved: false,
      };

      const gameState: GameState = {
        ...baseGameState,
        board,
        whiteState: {
          ...baseGameState.whiteState,
          energy: 1, // Not enough for queen (costs 8)
        },
      };

      const engine = new GameEngine(gameState);
      const move: MoveAttempt = {
        fromRow: 7,
        fromCol: 3,
        toRow: 6,
        toCol: 3,
        playerId: whitePlayerId,
        timestamp: baseTime,
      };

      const result = engine.attemptMove(move, baseTime);
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Insufficient energy');
    });
  });
});

