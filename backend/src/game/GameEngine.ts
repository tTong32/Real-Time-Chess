import { Board } from './Board';
import { MoveValidator } from './MoveValidator';
import { EnergyManager } from './EnergyManager';
import { CooldownManager } from './CooldownManager';
import { GameState, MoveAttempt, Piece, PieceColor, PlayerState } from './types';
import { PIECE_ENERGY_COSTS, PIECE_POINT_VALUES, PIECE_COOLDOWNS } from './constants';

export class GameEngine {
  private board: Board;
  private gameState: GameState;
  private moveValidator: MoveValidator;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.board = new Board(gameState.board);
    this.moveValidator = new MoveValidator(this.board);
  }

  attemptMove(move: MoveAttempt, currentTime: number): {
    success: boolean;
    reason?: string;
    newState?: GameState;
  } {
    // Determine player color
    const playerColor = this.getPlayerColor(move.playerId);
    if (!playerColor) {
      return { success: false, reason: 'Player not in game' };
    }

    // Get player state
    const playerState = playerColor === 'white'
      ? this.gameState.whiteState
      : this.gameState.blackState;

    // Update energy before validation
    this.updatePlayerState(playerState, currentTime);

    // Validate move
    const validation = this.moveValidator.validateMove(
      move,
      playerColor,
      playerState,
      currentTime
    );

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Execute move
    const result = this.executeMove(move, playerColor, playerState, currentTime);
    if (!result.success) {
      return { success: false, reason: 'Failed to execute move', newState: result.newState };
    }
    return { success: true, newState: result.newState };
  }

  private executeMove(
    move: MoveAttempt,
    playerColor: PieceColor,
    playerState: PlayerState,
    currentTime: number
  ): { success: boolean; newState: GameState; capturedPiece?: Piece | null } {
    const piece = this.board.getPiece(move.fromRow, move.fromCol)!;
    const targetPiece = this.board.getPiece(move.toRow, move.toCol);

    // Check if Prince is preventing capture
    if (targetPiece && targetPiece.type === 'prince' && targetPiece.canPreventCapture) {
      // Prince prevents capture, consume the ability
      targetPiece.canPreventCapture = false;

      // This means that the attacking piece stays at its original spot and gets put on cooldown
      piece.hasMoved = true;

      // Consume energy and set cooldown
      const energyCost = PIECE_ENERGY_COSTS[piece.type];
      EnergyManager.consumeEnergy(playerState, energyCost, currentTime);
      CooldownManager.setCooldown(piece.id, piece.type, playerState, currentTime);

      this.gameState.lastMoveAt = currentTime;
      this.gameState.board = this.board.getBoard();

      // Apply special effects
      this.applySpecialEffects(piece, move.toRow, move.toCol, currentTime);

      return { success: true, newState: this.getState(), capturedPiece: null };
    }

    // Normal capture or move
    const capturedPiece = targetPiece;

    // Consume energy
    const energyCost = PIECE_ENERGY_COSTS[piece.type];
    const energyResult = EnergyManager.consumeEnergy(playerState, energyCost, currentTime);

    if (!energyResult.success) {
      return { success: false, newState: this.getState() };
    }

    // Set cooldown
    CooldownManager.setCooldown(piece.id, piece.type, playerState, currentTime);

    // Move piece
    this.board.setPiece(move.fromRow, move.fromCol, null);
    piece.row = move.toRow;
    piece.col = move.toCol;
    piece.hasMoved = true;
    this.board.setPiece(move.toRow, move.toCol, piece);

    // Check for king capture (win condition)
    const winner = this.checkWinCondition(capturedPiece, playerColor);

    // Update game state
    this.gameState.lastMoveAt = currentTime;
    this.gameState.board = this.board.getBoard();

    if (winner) {
      this.gameState.status = 'finished';
      this.gameState.winner = winner;
    }

    // Apply special piece effects
    this.applySpecialEffects(piece, move.toRow, move.toCol, currentTime);

    return { success: true, newState: this.getState(), capturedPiece };
  }

  private applySpecialEffects(
    piece: Piece,
    row: number,
    col: number,
    currentTime: number
  ): void {
    switch (piece.type) {
      case 'pawnGeneral':
        this.applyPawnGeneralEffect(row, col, piece.color, currentTime);
        break;
      case 'iceBishop':
        this.applyIceBishopEffect(row, col, piece.color, currentTime);
        break;
    }
  }

  private applyPawnGeneralEffect(
    row: number,
    col: number,
    color: PieceColor,
    currentTime: number
  ): void {
    const playerState = color === 'white'
      ? this.gameState.whiteState
      : this.gameState.blackState;

    const adjacentPositions = [
      [row - 1, col], [row + 1, col],
      [row, col - 1], [row, col + 1],
      [row - 1, col - 1], [row - 1, col + 1],
      [row + 1, col - 1], [row + 1, col + 1],
    ];

    for (const [r, c] of adjacentPositions) {
      // Check bounds
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;

      const adjacentPiece = this.board.getPiece(r, c);
      if (adjacentPiece && adjacentPiece.color === color) {
        const currentCooldown = CooldownManager.getRemainingCooldown(
          adjacentPiece.id,
          playerState,
          currentTime
        );
        if (currentCooldown > 0) {
          // Reduce cooldown by 2 seconds (2000ms)
          const newCooldownEnd = currentTime + Math.max(0, currentCooldown - 2000);
          playerState.pieceCooldowns.set(adjacentPiece.id, newCooldownEnd);
        }
      }
    }
  }

  private applyIceBishopEffect(
    row: number,
    col: number,
    color: PieceColor,
    currentTime: number
  ): void {
    const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';
    const opponentState = opponentColor === 'white'
      ? this.gameState.whiteState
      : this.gameState.blackState;

    const adjacentPositions = [
      [row - 1, col], [row + 1, col],
      [row, col - 1], [row, col + 1],
      [row - 1, col - 1], [row - 1, col + 1],
      [row + 1, col - 1], [row + 1, col + 1],
    ];

    for (const [r, c] of adjacentPositions) {
      // Check bounds
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;

      const adjacentPiece = this.board.getPiece(r, c);
      if (adjacentPiece && adjacentPiece.color === opponentColor) {
        const currentCooldown = CooldownManager.getRemainingCooldown(
          adjacentPiece.id,
          opponentState,
          currentTime
        );

        const maxCooldown = PIECE_COOLDOWNS[adjacentPiece.type] * 1000;
        let newCooldownEnd: number;

        if (currentCooldown > 0) {
          // Already on cooldown: add 3 seconds, but don't exceed max
          newCooldownEnd = currentTime + Math.min(currentCooldown + 3000, maxCooldown);
        } else {
          // Not on cooldown: set to 3 seconds
          newCooldownEnd = currentTime + 3000;
        }

        opponentState.pieceCooldowns.set(adjacentPiece.id, newCooldownEnd);
      }
    }
  }

  private checkWinCondition(capturedPiece: Piece | null, playerColor: PieceColor): PieceColor | null {
    if (capturedPiece && capturedPiece.type === 'king') {
      return playerColor;
    }
    return null;
  }

  calculatePlayerPoints(color: PieceColor): number {
    let totalPoints = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board.getPiece(row, col);
        if (piece && piece.color === color) {
          totalPoints += PIECE_POINT_VALUES[piece.type];
        }
      }
    }
    return totalPoints;
  }

  checkSimultaneousKingCapture(
    whiteCapturedKing: boolean,
    blackCapturedKing: boolean
  ): PieceColor | null {
    if (!whiteCapturedKing && !blackCapturedKing) return null;

    // If both kings captured simultaneously, use points to determine winner
    if (whiteCapturedKing && blackCapturedKing) {
      const whitePoints = this.calculatePlayerPoints('white');
      const blackPoints = this.calculatePlayerPoints('black');

      if (whitePoints > blackPoints) return 'white';
      if (blackPoints > whitePoints) return 'black';
      // Tie goes to white
      return 'white';
    }

    // Only one king captured
    if (whiteCapturedKing) return 'white';
    if (blackCapturedKing) return 'black';

    return null;
  }

  private getPlayerColor(playerId: string): PieceColor | null {
    if (this.gameState.whitePlayerId === playerId) return 'white';
    if (this.gameState.blackPlayerId === playerId) return 'black';
    return null;
  }

  private updatePlayerState(playerState: PlayerState, currentTime: number): void {
    if (!this.gameState.startedAt) return;

    // Update energy regen rate
    const newRate = EnergyManager.updateEnergyRegenRate(
      playerState,
      this.gameState.startedAt,
      currentTime
    );
    playerState.energyRegenRate = newRate;

    // Update energy
    playerState.energy = EnergyManager.calculateCurrentEnergy(playerState, currentTime);
    playerState.lastEnergyUpdate = currentTime;

    // Clean up expired cooldowns
    CooldownManager.updateCooldowns(playerState, currentTime);
  }

  getState(): GameState {
    return {
      ...this.gameState,
      board: this.board.getBoard(),
    };
  }

  updateState(currentTime: number): void {
    this.updatePlayerState(this.gameState.whiteState, currentTime);
    this.updatePlayerState(this.gameState.blackState, currentTime);
  }
}