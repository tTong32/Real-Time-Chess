import { PieceType } from './types';

/**
 * Cooldown duration (in seconds) for each piece type after moving
 */
export const PIECE_COOLDOWNS: Record<PieceType, number> = {
  // Standard pieces
  pawn: 4,
  knight: 5,
  bishop: 6,
  rook: 7,
  queen: 9,
  king: 11,
  // Custom pieces
  twistedPawn: 4, // Same as pawn
  pawnGeneral: 5,
  prince: 5, // Same as knight
  flyingCastle: 7, // Same as rook
  iceBishop: 6, // Same as bishop
};

/**
 * Energy cost to move each piece type
 */
export const PIECE_ENERGY_COSTS: Record<PieceType, number> = {
  // Standard pieces
  pawn: 2,
  knight: 3,
  bishop: 4,
  rook: 5,
  queen: 8,
  king: 10,
  // Custom pieces
  twistedPawn: 2, // Same as pawn
  pawnGeneral: 3,
  prince: 3, // Same as knight
  flyingCastle: 5, // Same as rook
  iceBishop: 4, // Same as bishop
};

/**
 * Point values for each piece (used for tie-breaking when both kings are captured simultaneously)
 * Standard chess values: Pawn=1, Knight/Bishop=3, Rook=5, Queen=9
 */
export const PIECE_POINT_VALUES: Record<PieceType, number> = {
  // Standard pieces
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0, // King has no point value (capturing it wins)
  // Custom pieces (using equivalent standard piece values)
  twistedPawn: 1, // Pawn value
  pawnGeneral: 1, // Pawn value
  prince: 3, // Knight value
  flyingCastle: 5, // Rook value
  iceBishop: 3, // Bishop value
};

/**
 * Energy system constants
 */
export const INITIAL_ENERGY = 6;
export const MAX_ENERGY = 25;
export const INITIAL_ENERGY_REGEN = 0.5; // Energy per second
export const ENERGY_REGEN_INCREASE = 0.5; // Additional energy per second every interval
export const MAX_ENERGY_REGEN = 10; // Maximum energy regeneration rate
export const ENERGY_REGEN_INTERVAL = 15000; // 15 seconds in milliseconds

/**
 * Board dimensions
 */
export const BOARD_SIZE = 8; // 8x8 chess board
export const ROWS = 8;
export const COLS = 8;

