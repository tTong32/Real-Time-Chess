import { Board } from './Board';
import { Piece, PieceType, PieceColor, MoveAttempt, PlayerState } from './types';
import { PIECE_COOLDOWNS, PIECE_ENERGY_COSTS } from './constants';

/**
 * Result of move validation
 */
export interface MoveValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * MoveValidator class for validating chess moves
 */
export class MoveValidator {
  constructor(private board: Board) {}

  /**
   * Validates a move attempt including piece ownership, cooldown, energy, and legality
   * @param move - The move attempt
   * @param playerColor - The color of the player making the move
   * @param playerState - The player's state (energy, cooldowns)
   * @param currentTime - Current timestamp in milliseconds
   * @returns Validation result with valid flag and optional reason
   */
  validateMove(
    move: MoveAttempt,
    playerColor: PieceColor,
    playerState: PlayerState,
    currentTime: number
  ): MoveValidationResult {
    const piece = this.board.getPiece(move.fromRow, move.fromCol);

    // Check piece exists and belongs to player
    if (!piece || piece.color !== playerColor) {
      return { valid: false, reason: 'Invalid piece' };
    }

    // Check cooldown
    const cooldownEnd = playerState.pieceCooldowns.get(piece.id);
    if (cooldownEnd && currentTime < cooldownEnd) {
      return { valid: false, reason: 'Piece on cooldown' };
    }

    // Check energy
    const energyCost = PIECE_ENERGY_COSTS[piece.type];
    if (playerState.energy < energyCost) {
      return { valid: false, reason: 'Insufficient energy' };
    }

    // Check if move is legal
    if (!this.isLegalMove(piece, move.fromRow, move.fromCol, move.toRow, move.toCol)) {
      return { valid: false, reason: 'Illegal move' };
    }

    return { valid: true };
  }

  /**
   * Checks if a move is legally valid based on piece type and board state
   * @param piece - The piece to move
   * @param fromRow - Source row
   * @param fromCol - Source column
   * @param toRow - Destination row
   * @param toCol - Destination column
   * @returns true if the move is legal
   */
  private isLegalMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Check if destination is valid
    if (!this.board.isValidPosition(toRow, toCol)) return false;

    const targetPiece = this.board.getPiece(toRow, toCol);

    // Can't capture own pieces
    if (targetPiece && targetPiece.color === piece.color) return false;

    // Validate based on piece type
    switch (piece.type) {
      case 'pawn':
        return this.validatePawnMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
      case 'knight':
        return this.validateKnightMove(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return this.validateBishopMove(fromRow, fromCol, toRow, toCol);
      case 'rook':
        return this.validateRookMove(fromRow, fromCol, toRow, toCol);
      case 'queen':
        return this.validateQueenMove(fromRow, fromCol, toRow, toCol);
      case 'king':
        return this.validateKingMove(fromRow, fromCol, toRow, toCol);
      // Custom pieces
      case 'twistedPawn':
        return this.validateTwistedPawnMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
      case 'pawnGeneral':
        return this.validatePawnGeneralMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
      case 'flyingCastle':
        return this.validateFlyingCastleMove(fromRow, fromCol, toRow, toCol);
      case 'prince':
        return this.validateKnightMove(fromRow, fromCol, toRow, toCol); // Moves like knight
      case 'iceBishop':
        return this.validateIceBishopMove(fromRow, fromCol, toRow, toCol);
      default:
        return false;
    }
  }

  /**
   * Validates a standard pawn move
   * Pawns move forward, capture diagonally, and can move 2 squares on first move
   */
  private validatePawnMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    targetPiece: Piece | null
  ): boolean {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    // Forward move
    if (fromCol === toCol) {
      if (targetPiece) return false; // Can't capture forward
      if (toRow === fromRow + direction) return true;
      // Two square move from starting position
      if (fromRow === startRow && toRow === fromRow + 2 * direction) {
        // Can't jump over piece
        return !this.board.getPiece(fromRow + direction, fromCol);
      }
    }

    // Capture diagonally
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      return targetPiece !== null && targetPiece.color !== piece.color;
    }

    return false;
  }

  /**
   * Validates a knight move (L-shaped)
   */
  private validateKnightMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  /**
   * Validates a bishop move (diagonal)
   */
  private validateBishopMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Must move diagonally (same change in row and column)
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  /**
   * Validates a rook move (horizontal or vertical)
   */
  private validateRookMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Must move in a straight line (either row or column stays the same)
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  /**
   * Validates a queen move (combination of bishop and rook)
   */
  private validateQueenMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    return (
      this.validateBishopMove(fromRow, fromCol, toRow, toCol) ||
      this.validateRookMove(fromRow, fromCol, toRow, toCol)
    );
  }

  /**
   * Validates a king move (one square in any direction)
   */
  private validateKingMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    // King can move one square in any direction
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
  }

  /**
   * Validates a twisted pawn move
   * Twisted pawn moves diagonally forward, captures straight
   */
  private validateTwistedPawnMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    targetPiece: Piece | null
  ): boolean {
    const direction = piece.color === 'white' ? -1 : 1;

    // Moves diagonally forward (no capture)
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      if (targetPiece) return false; // Can't capture diagonally
      return true;
    }

    // Captures straight forward
    if (fromCol === toCol && toRow === fromRow + direction) {
      return targetPiece !== null && targetPiece.color !== piece.color;
    }

    return false;
  }

  /**
   * Validates a pawn general move
   * Pawn general moves like a standard pawn
   */
  private validatePawnGeneralMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    targetPiece: Piece | null
  ): boolean {
    // Pawn general moves like a standard pawn
    return this.validatePawnMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
  }

  /**
   * Validates a flying castle move
   * Flying castle moves like a rook but can jump over one blocking piece
   */
  private validateFlyingCastleMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Must move in a straight line (like rook)
    if (fromRow !== toRow && fromCol !== toCol) return false;

    // Can jump over one piece
    const path = this.getPath(fromRow, fromCol, toRow, toCol);
    const piecesInPath = path.filter(
      ([r, c]) => this.board.getPiece(r, c) !== null
    ).length;

    // Can have at most 1 piece in path (the piece being jumped over, excluding start and end)
    // Actually, we need to count pieces between start and end
    let piecesBetween = 0;
    for (let i = 1; i < path.length - 1; i++) {
      const [r, c] = path[i];
      if (this.board.getPiece(r, c) !== null) {
        piecesBetween++;
      }
    }

    return piecesBetween <= 1;
  }

  /**
   * Validates an ice bishop move
   * Ice bishop moves like a standard bishop
   */
  private validateIceBishopMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Ice bishop moves like a standard bishop
    return this.validateBishopMove(fromRow, fromCol, toRow, toCol);
  }

  /**
   * Checks if the path between two positions is clear of pieces
   * Excludes the start and end positions
   */
  private isPathClear(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const path = this.getPath(fromRow, fromCol, toRow, toCol);
    // Check all positions except start and end
    for (let i = 1; i < path.length - 1; i++) {
      const [r, c] = path[i];
      if (this.board.getPiece(r, c)) return false;
    }
    return true;
  }

  /**
   * Gets all positions in the path between two squares
   * Includes both start and end positions
   */
  private getPath(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): [number, number][] {
    const path: [number, number][] = [];
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

    let r = fromRow;
    let c = fromCol;

    // Add all positions including destination
    while (true) {
      path.push([r, c]);
      if (r === toRow && c === toCol) break;
      r += rowStep;
      c += colStep;
    }

    return path;
  }
}

