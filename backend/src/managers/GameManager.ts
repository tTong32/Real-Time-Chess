import { GameEngine } from '../game/GameEngine';
import { GameState, MoveAttempt, Piece, PieceColor, PlayerState } from '../game/types';
import { Board } from '../game/Board';
import { EnergyManager } from '../game/EnergyManager';
import prisma from '../config/database';
import { GameStatus } from '@prisma/client';

/**
 * GameManager manages active games and coordinates between GameEngine and database
 * - Maintains in-memory GameEngine instances for active games
 * - Handles game creation, starting, and ending
 * - Persists game state to database
 * - Updates ELO ratings for rated games
 */
export class GameManager {
  private activeGames: Map<string, GameEngine> = new Map();
  private gameLoopInterval: NodeJS.Timeout | null = null;
  private readonly GAME_LOOP_INTERVAL = 1000; // Update every second
  private readonly STATE_SAVE_INTERVAL = 5000; // Save state every 5 seconds

  constructor() {
    this.startGameLoop();
  }

  /**
   * Create a new game in the database
   * @param whiteId - User ID of white player
   * @param blackId - User ID of black player
   * @param isRated - Whether this is a rated game
   * @param roomCode - Optional room code for friend games
   * @returns Game ID
   */
  async createGame(
    whiteId: string,
    blackId: string,
    isRated: boolean = false,
    roomCode?: string
  ): Promise<string> {
    const initialBoard = this.getInitialBoardState();
    const initialPlayerState = this.getInitialPlayerState();

    const game = await prisma.game.create({
      data: {
        whiteId,
        blackId,
        status: GameStatus.WAITING,
        isRated,
        roomCode: roomCode || null,
        boardState: initialBoard as any,
        whiteState: initialPlayerState as any,
        blackState: initialPlayerState as any,
      },
    });

    return game.id;
  }

  /**
   * Start a game (load it into memory and activate it)
   * @param gameId - Game ID to start
   */
  async startGame(gameId: string): Promise<void> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      throw new Error('Game not found');
    }

    if (game.status !== GameStatus.WAITING) {
      throw new Error(`Cannot start game with status ${game.status}`);
    }

    const gameState = this.loadGameState(game);
    const engine = new GameEngine(gameState);

    this.activeGames.set(gameId, engine);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Attempt to make a move in a game
   * @param gameId - Game ID
   * @param move - Move attempt
   * @returns Result with success status and optional reason
   */
  async attemptMove(
    gameId: string,
    move: MoveAttempt
  ): Promise<{ success: boolean; reason?: string }> {
    // Get or load game engine
    let engine = this.activeGames.get(gameId);
    if (!engine) {
      // Try to load from database
      const game = await prisma.game.findUnique({
        where: { id: gameId },
      });
      if (!game) {
        return { success: false, reason: 'Game not found' };
      }
      if (game.status !== GameStatus.ACTIVE) {
        return { success: false, reason: `Game is not active (status: ${game.status})` };
      }
      const gameState = this.loadGameState(game);
      engine = new GameEngine(gameState);
      this.activeGames.set(gameId, engine);
    }

    const currentTime = Date.now();
    engine.updateState(currentTime);

    const result = engine.attemptMove(move, currentTime);

    if (result.success && result.newState) {
      // Check for win conditions
      const state = result.newState;
      const winner = this.checkWinCondition(state, engine);

      if (winner !== null) {
        state.status = 'finished';
        state.winner = winner;
        await this.saveGameState(gameId, state);
        await this.endGame(gameId, winner);
      } else {
        // Save state after move
        await this.saveGameState(gameId, state);
      }
    }

    return result;
  }

  /**
   * Get current game state
   * @param gameId - Game ID
   * @returns GameState or null if game not found
   */
  getGameState(gameId: string): GameState | null {
    const engine = this.activeGames.get(gameId);
    if (!engine) {
      return null;
    }

    const currentTime = Date.now();
    engine.updateState(currentTime);
    return engine.getState();
  }

  /**
   * Load game state from database (even if not active)
   * @param gameId - Game ID
   * @returns GameState or null if game not found
   */
  async loadGameStateFromDb(gameId: string): Promise<GameState | null> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return null;
    }
    return this.loadGameState(game);
  }

  /**
   * Get active game IDs
   * @returns Array of active game IDs
   */
  getActiveGameIds(): string[] {
    return Array.from(this.activeGames.keys());
  }

  /**
   * Check if a game is active (in memory)
   * @param gameId - Game ID
   * @returns true if game is active
   */
  isGameActive(gameId: string): boolean {
    return this.activeGames.has(gameId);
  }

  /**
   * Remove a game from active games (cleanup)
   * @param gameId - Game ID
   */
  removeActiveGame(gameId: string): void {
    this.activeGames.delete(gameId);
  }

  /**
   * Start the game loop for periodic state updates and persistence
   */
  private startGameLoop(): void {
    if (this.gameLoopInterval) {
      return; // Already started
    }

    let lastSaveTime = Date.now();

    this.gameLoopInterval = setInterval(() => {
      const currentTime = Date.now();
      const shouldSave = currentTime - lastSaveTime >= this.STATE_SAVE_INTERVAL;

      // Update all active games
      this.activeGames.forEach((engine, gameId) => {
        engine.updateState(currentTime);

        // Periodically save state to database
        if (shouldSave) {
          const state = engine.getState();
          this.saveGameState(gameId, state).catch((error) => {
            console.error(`Failed to save game state for game ${gameId}:`, error);
          });
        }
      });

      if (shouldSave) {
        lastSaveTime = currentTime;
      }
    }, this.GAME_LOOP_INTERVAL);
  }

  /**
   * Stop the game loop (for cleanup/testing)
   */
  stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
  }

  /**
   * Save game state to database
   * @param gameId - Game ID
   * @param state - Game state to save
   */
  private async saveGameState(gameId: string, state: GameState): Promise<void> {
    // Serialize player states for database storage
    const whiteStateSerialized = this.serializePlayerState(state.whiteState);
    const blackStateSerialized = this.serializePlayerState(state.blackState);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        boardState: state.board as any,
        whiteState: whiteStateSerialized as any,
        blackState: blackStateSerialized as any,
        lastMoveAt: state.lastMoveAt ? new Date(state.lastMoveAt) : null,
        status: this.mapStatus(state.status),
        winnerId: state.winner
          ? await this.getWinnerId(gameId, state.winner)
          : null,
      },
    });
  }

  /**
   * End a game and update ELO if rated
   * @param gameId - Game ID
   * @param winner - Winner color
   */
  private async endGame(gameId: string, winner: PieceColor): Promise<void> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return;
    }

    const winnerId = winner === 'white' ? game.whiteId : game.blackId;

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.FINISHED,
        winnerId,
        endedAt: new Date(),
      },
    });

    // Update ELO if rated game
    if (game.isRated) {
      await this.updateElo(game.whiteId, game.blackId, winnerId);
    }

    // Remove from active games
    this.activeGames.delete(gameId);
  }

  /**
   * Update ELO ratings for both players
   * Uses standard ELO rating system
   * @param whiteId - White player ID
   * @param blackId - Black player ID
   * @param winnerId - Winner player ID
   */
  private async updateElo(
    whiteId: string,
    blackId: string,
    winnerId: string
  ): Promise<void> {
    const white = await prisma.user.findUnique({ where: { id: whiteId } });
    const black = await prisma.user.findUnique({ where: { id: blackId } });

    if (!white || !black) {
      console.error('Could not update ELO: one or both users not found');
      return;
    }

    const kFactor = 32; // Standard ELO K-factor

    // Calculate expected scores
    const whiteExpected =
      1 / (1 + Math.pow(10, (black.elo - white.elo) / 400));
    const blackExpected =
      1 / (1 + Math.pow(10, (white.elo - black.elo) / 400));

    // Actual scores
    const whiteScore = winnerId === whiteId ? 1 : 0;
    const blackScore = winnerId === blackId ? 1 : 0;

    // Calculate new ELO ratings
    const whiteNewElo = Math.round(
      white.elo + kFactor * (whiteScore - whiteExpected)
    );
    const blackNewElo = Math.round(
      black.elo + kFactor * (blackScore - blackExpected)
    );

    // Update in database
    await prisma.user.update({
      where: { id: whiteId },
      data: { elo: whiteNewElo },
    });
    await prisma.user.update({
      where: { id: blackId },
      data: { elo: blackNewElo },
    });
  }

  /**
   * Check win condition based on board state
   * @param state - Current game state
   * @param engine - Game engine for point calculations
   * @returns Winner color or null if no winner
   */
  private checkWinCondition(
    state: GameState,
    engine: GameEngine
  ): PieceColor | null {
    const whiteKingExists = this.kingExists(state.board, 'white');
    const blackKingExists = this.kingExists(state.board, 'black');

    // Both kings captured simultaneously - use points to determine winner
    if (!whiteKingExists && !blackKingExists) {
      const whitePoints = engine.calculatePlayerPoints('white');
      const blackPoints = engine.calculatePlayerPoints('black');

      if (whitePoints > blackPoints) return 'white';
      if (blackPoints > whitePoints) return 'black';
      // Tie goes to white
      return 'white';
    }

    // Only one king captured
    if (!whiteKingExists) return 'black';
    if (!blackKingExists) return 'white';

    return null; // Game continues
  }

  /**
   * Check if a king of a specific color exists on the board
   * @param board - Board state
   * @param color - Color to check
   * @returns true if king exists
   */
  private kingExists(
    board: (Piece | null)[][],
    color: PieceColor
  ): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get winner user ID from game
   * @param gameId - Game ID
   * @param winner - Winner color
   * @returns Winner user ID or null
   */
  private async getWinnerId(
    gameId: string,
    winner: PieceColor
  ): Promise<string | null> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return null;
    return winner === 'white' ? game.whiteId : game.blackId;
  }

  /**
   * Load game state from database record
   * @param game - Database game record
   * @returns GameState
   */
  private loadGameState(game: any): GameState {
    return {
      id: game.id,
      board: game.boardState as (Piece | null)[][],
      whiteState: this.deserializePlayerState(game.whiteState),
      blackState: this.deserializePlayerState(game.blackState),
      whitePlayerId: game.whiteId,
      blackPlayerId: game.blackId,
      currentTurn: null, // Real-time gameplay
      status: this.mapDbStatus(game.status),
      winner:
        game.winnerId === game.whiteId
          ? 'white'
          : game.winnerId === game.blackId
          ? 'black'
          : null,
      startedAt: game.startedAt ? game.startedAt.getTime() : null,
      lastMoveAt: game.lastMoveAt ? game.lastMoveAt.getTime() : null,
    };
  }

  /**
   * Deserialize player state from database (convert Map from object)
   * @param state - Serialized player state
   * @returns Deserialized PlayerState
   */
  private deserializePlayerState(state: any): PlayerState {
    const cooldowns = new Map<string, number>();
    if (state.pieceCooldowns) {
      // pieceCooldowns might be stored as object or array
      if (typeof state.pieceCooldowns === 'object' && !Array.isArray(state.pieceCooldowns)) {
        for (const [pieceId, cooldownEnd] of Object.entries(state.pieceCooldowns)) {
          cooldowns.set(pieceId, Number(cooldownEnd));
        }
      }
    }

    return {
      energy: state.energy ?? 6,
      energyRegenRate: state.energyRegenRate ?? 0.5,
      lastEnergyUpdate: state.lastEnergyUpdate ?? Date.now(),
      pieceCooldowns: cooldowns,
    };
  }

  /**
   * Serialize player state for database storage (convert Map to object)
   * @param state - PlayerState
   * @returns Serialized player state
   */
  private serializePlayerState(state: PlayerState): any {
    const cooldownsObj: Record<string, number> = {};
    for (const [pieceId, cooldownEnd] of state.pieceCooldowns.entries()) {
      cooldownsObj[pieceId] = cooldownEnd;
    }

    return {
      energy: state.energy,
      energyRegenRate: state.energyRegenRate,
      lastEnergyUpdate: state.lastEnergyUpdate,
      pieceCooldowns: cooldownsObj,
    };
  }

  /**
   * Get initial board state (standard chess starting position)
   * @returns Initial board configuration
   */
  private getInitialBoardState(): (Piece | null)[][] {
    const board = new Board();
    return board.getBoard();
  }

  /**
   * Get initial player state
   * @returns Initial PlayerState
   */
  private getInitialPlayerState(): any {
    const now = Date.now();
    return {
      energy: 6,
      energyRegenRate: 0.5,
      lastEnergyUpdate: now,
      pieceCooldowns: {},
    };
  }

  /**
   * Map game status string to Prisma GameStatus enum
   * @param status - Status string
   * @returns GameStatus enum
   */
  private mapStatus(
    status: 'waiting' | 'active' | 'paused' | 'finished'
  ): GameStatus {
    switch (status) {
      case 'waiting':
        return GameStatus.WAITING;
      case 'active':
        return GameStatus.ACTIVE;
      case 'paused':
        return GameStatus.PAUSED;
      case 'finished':
        return GameStatus.FINISHED;
      default:
        return GameStatus.WAITING;
    }
  }

  /**
   * Map Prisma GameStatus enum to status string
   * @param status - GameStatus enum
   * @returns Status string
   */
  private mapDbStatus(
    status: GameStatus
  ): 'waiting' | 'active' | 'paused' | 'finished' {
    switch (status) {
      case GameStatus.WAITING:
        return 'waiting';
      case GameStatus.ACTIVE:
        return 'active';
      case GameStatus.PAUSED:
        return 'paused';
      case GameStatus.FINISHED:
        return 'finished';
      default:
        return 'waiting';
    }
  }
}

// Export singleton instance
export const gameManager = new GameManager();

