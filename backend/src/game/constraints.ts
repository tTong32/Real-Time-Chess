import { PieceType } from './types';

/**
 * Piece categories for custom board replacement constraints
 */
export enum PieceCategory {
  PAWN = 'pawn', // All pawn-like pieces
  NON_PAWN_NON_KING = 'nonPawnNonKing', // All pieces that aren't pawns or kings
  KING = 'king', // All king pieces
}

/**
 * Maps piece types to their categories for replacement validation
 */
export const PIECE_CATEGORIES: Record<PieceType, PieceCategory> = {
  // Pawns
  pawn: PieceCategory.PAWN,
  twistedPawn: PieceCategory.PAWN,
  pawnGeneral: PieceCategory.PAWN,
  
  // Non-pawn, non-king pieces
  knight: PieceCategory.NON_PAWN_NON_KING,
  bishop: PieceCategory.NON_PAWN_NON_KING,
  rook: PieceCategory.NON_PAWN_NON_KING,
  queen: PieceCategory.NON_PAWN_NON_KING,
  prince: PieceCategory.NON_PAWN_NON_KING,
  flyingCastle: PieceCategory.NON_PAWN_NON_KING,
  iceBishop: PieceCategory.NON_PAWN_NON_KING,
  
  // Kings
  king: PieceCategory.KING,
  // Note: If more king types are added later, they should be in KING category
};

/**
 * Standard chess piece positions
 * These define where standard pieces start on a default board
 */
export const STANDARD_BOARD_POSITIONS = {
  // Front row pieces (pawns)
  FRONT_ROW: ['pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'],
  
  // Back row pieces (non-pawn, non-king)
  BACK_ROW: ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'],
  
  // King position (always in back row, column 4 for white, column 4 for black)
  KING_COLUMN: 4,
};

/**
 * Checks if two piece types can replace each other in a custom board
 * 
 * Rules:
 * - Pawn pieces can replace pawns
 * - Any non-king/non-pawn piece can replace each other
 * - Kings can only replace kings (and potentially other king types)
 * 
 * @param originalType - The original piece type being replaced
 * @param replacementType - The new piece type to replace it with
 * @returns true if replacement is valid, false otherwise
 */
export function canReplacePiece(
  originalType: PieceType,
  replacementType: PieceType
): boolean {
  const originalCategory = PIECE_CATEGORIES[originalType];
  const replacementCategory = PIECE_CATEGORIES[replacementType];
  
  // Pieces can only be replaced by pieces in the same category
  return originalCategory === replacementCategory;
}

/**
 * Checks if a piece type belongs to the pawn category
 * 
 * @param pieceType - The piece type to check
 * @returns true if the piece is a pawn-type piece
 */
export function isPawnType(pieceType: PieceType): boolean {
  return PIECE_CATEGORIES[pieceType] === PieceCategory.PAWN;
}

/**
 * Checks if a piece type belongs to the king category
 * 
 * @param pieceType - The piece type to check
 * @returns true if the piece is a king-type piece
 */
export function isKingType(pieceType: PieceType): boolean {
  return PIECE_CATEGORIES[pieceType] === PieceCategory.KING;
}

/**
 * Checks if a piece type belongs to the non-pawn, non-king category
 * 
 * @param pieceType - The piece type to check
 * @returns true if the piece can replace other non-pawn/non-king pieces
 */
export function isNonPawnNonKingType(pieceType: PieceType): boolean {
  return PIECE_CATEGORIES[pieceType] === PieceCategory.NON_PAWN_NON_KING;
}

/**
 * Gets all piece types that can replace a given piece type
 * 
 * @param pieceType - The piece type to find replacements for
 * @returns Array of piece types that can replace the given type
 */
export function getReplaceablePieces(pieceType: PieceType): PieceType[] {
  const category = PIECE_CATEGORIES[pieceType];
  return (Object.keys(PIECE_CATEGORIES) as PieceType[]).filter(
    type => PIECE_CATEGORIES[type] === category
  );
}

/**
 * Gets all piece types in a specific category
 * 
 * @param category - The piece category
 * @returns Array of piece types in that category
 */
export function getPiecesByCategory(category: PieceCategory): PieceType[] {
  return (Object.keys(PIECE_CATEGORIES) as PieceType[]).filter(
    type => PIECE_CATEGORIES[type] === category
  );
}

/**
 * Validates a custom board configuration
 * Ensures that piece replacements follow the constraints
 * 
 * @param board - The custom board configuration (8x8 array of PieceType | null)
 * @returns Validation result with valid flag and optional error message
 */
export function validateCustomBoard(
  board: (PieceType | null)[][]
): { valid: boolean; error?: string } {
  if (!board || board.length !== 8) {
    return { valid: false, error: 'Board must be 8x8' };
  }

  for (let row = 0; row < 8; row++) {
    if (!board[row] || board[row].length !== 8) {
      return { valid: false, error: `Row ${row} must have 8 columns` };
    }

    for (let col = 0; col < 8; col++) {
      const pieceType = board[row][col];
      if (pieceType === null) continue;

      // Check if piece type is valid
      if (!(pieceType in PIECE_CATEGORIES)) {
        return { valid: false, error: `Invalid piece type at row ${row}, col ${col}` };
      }

      // Validate king positions (must be in back row, column 4)
      if (isKingType(pieceType)) {
        const isBackRow = row === 0 || row === 7;
        const isKingColumn = col === 4;
        if (!isBackRow || !isKingColumn) {
          return {
            valid: false,
            error: `King at row ${row}, col ${col} must be in back row, column 4`,
          };
        }
      }
    }
  }

  return { valid: true };
}

