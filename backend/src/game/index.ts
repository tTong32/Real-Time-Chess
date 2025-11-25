/**
 * Game module exports
 * Core game engine types, constants, and utilities
 */

// Types
export type {
  PieceType,
  PieceColor,
  Piece,
  PlayerState,
  GameState,
  MoveAttempt,
} from './types';

// Constants
export {
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

// Constraints and validation
export {
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

// Board class
export { Board } from './Board';

// MoveValidator class
export { MoveValidator, type MoveValidationResult } from './MoveValidator';

