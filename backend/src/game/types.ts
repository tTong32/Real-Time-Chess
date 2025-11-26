/**
 * Piece types in the game
 * - Standard chess pieces: pawn, knight, bishop, rook, queen, king
 * - Custom pieces: twistedPawn, pawnGeneral, flyingCastle, prince, iceBishop
 */
export type PieceType =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king'
  | 'twistedPawn'
  | 'pawnGeneral'
  | 'flyingCastle'
  | 'prince'
  | 'iceBishop';

/**
 * Piece colors
 */
export type PieceColor = 'white' | 'black';

/**
 * Piece interface representing a piece on the board
 */
export interface Piece {
  id: string; // Unique identifier for the piece
  type: PieceType;
  color: PieceColor;
  row: number; // 0-7
  col: number; // 0-7
  hasMoved: boolean; // Whether the piece has moved from its starting position
  canPreventCapture?: boolean; // For Prince: can prevent capture once per game
}

/**
 * Player state tracking energy and cooldowns
 */
export interface PlayerState {
  energy: number; // Current energy (0-25)
  energyRegenRate: number; // Energy regeneration rate per second
  lastEnergyUpdate: number; // Timestamp of last energy update
  pieceCooldowns: Map<string, number>; // pieceId -> cooldownEndTimestamp (milliseconds)
}

/**
 * Game state containing board and player states
 */
export interface GameState {
  id: string;
  board: (Piece | null)[][]; // 8x8 board
  whiteState: PlayerState;
  blackState: PlayerState;
  whitePlayerId?: string; // ID of white player
  blackPlayerId?: string; // ID of black player
  currentTurn: PieceColor | null; // null for real-time gameplay
  status: 'waiting' | 'active' | 'paused' | 'finished';
  winner: PieceColor | null;
  startedAt: number | null; // Timestamp
  lastMoveAt: number | null; // Timestamp
}

/**
 * Move attempt from a player
 */
export interface MoveAttempt {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  playerId: string;
  timestamp: number; // Milliseconds since epoch
}

