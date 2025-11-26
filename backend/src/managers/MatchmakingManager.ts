import { gameManager } from './GameManager';
import prisma from '../config/database';

/**
 * Queue entry information
 */
export interface QueueEntry {
  userId: string;
  socketId: string;
  elo: number;
  joinedAt: number;
}

/**
 * Matchmaking result
 */
export interface MatchmakingResult {
  matched: boolean;
  gameId?: string;
  opponentId?: string;
  reason?: string;
}

/**
 * Queue operation result
 */
export interface QueueResult {
  success: boolean;
  error?: string;
  matched?: boolean;
  gameId?: string;
}

/**
 * Callback type for match notifications
 */
export type MatchFoundCallback = (player1Id: string, player2Id: string, gameId: string) => void;

/**
 * MatchmakingManager handles ELO-based matchmaking for rated games
 * - Maintains a queue of players waiting for matches
 * - Matches players based on ELO rating similarity
 * - Creates rated games when matches are found
 * - Supports expanding ELO range over time
 */
export class MatchmakingManager {
  private queue: Map<string, QueueEntry> = new Map();
  private defaultEloRange: number = 200; // Default ELO range for matching
  private maxEloRange: number = 500; // Maximum ELO range after waiting
  private eloRangeExpansionRate: number = 50; // Expand by 50 points per interval
  private eloRangeExpansionInterval: number = 1000 * 30; // 30 seconds
  private matchingInterval: NodeJS.Timeout | null = null;
  private readonly MATCHING_CHECK_INTERVAL = 1000; // Check for matches every second
  private matchFoundCallbacks: MatchFoundCallback[] = [];

  constructor() {
    this.startMatchingLoop();
  }

  /**
   * Register a callback to be called when matches are found
   * @param callback - Callback function
   */
  onMatchFound(callback: MatchFoundCallback): void {
    this.matchFoundCallbacks.push(callback);
  }

  /**
   * Notify all registered callbacks of a match
   * @param player1Id - First player ID
   * @param player2Id - Second player ID
   * @param gameId - Game ID
   */
  private notifyMatchFound(player1Id: string, player2Id: string, gameId: string): void {
    for (const callback of this.matchFoundCallbacks) {
      try {
        callback(player1Id, player2Id, gameId);
      } catch (error) {
        console.error('Error in match found callback:', error);
      }
    }
  }

  /**
   * Add a player to the matchmaking queue
   * @param userId - User ID
   * @param socketId - Socket ID for real-time communication
   * @returns Queue result with success status
   */
  async addToQueue(userId: string, socketId: string): Promise<QueueResult> {
    // Check if already in queue
    if (this.queue.has(userId)) {
      return {
        success: false,
        error: 'Player is already in the matchmaking queue',
      };
    }

    // Get user's ELO rating
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { elo: true },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Add to queue
    const queueEntry: QueueEntry = {
      userId,
      socketId,
      elo: user.elo,
      joinedAt: Date.now(),
    };

    this.queue.set(userId, queueEntry);

    // Try to find a match immediately if there are other players
    if (this.queue.size >= 2) {
      const matchResult = await this.findMatch(userId);
      if (matchResult.matched && matchResult.gameId) {
        // Player was matched and removed from queue by findMatch
        return {
          success: true,
          matched: true,
          gameId: matchResult.gameId,
        };
      }
    }

    // Player is in queue, waiting for match
    return {
      success: true,
      matched: false,
    };
  }

  /**
   * Remove a player from the matchmaking queue
   * @param userId - User ID
   * @returns Queue result with success status
   */
  removeFromQueue(userId: string): QueueResult {
    if (!this.queue.has(userId)) {
      return {
        success: false,
        error: 'Player is not in the matchmaking queue',
      };
    }

    this.queue.delete(userId);
    return {
      success: true,
    };
  }

  /**
   * Check if a player is in the queue
   * @param userId - User ID
   * @returns true if player is in queue
   */
  isInQueue(userId: string): boolean {
    return this.queue.has(userId);
  }

  /**
   * Get queue size
   * @returns Number of players in queue
   */
  getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Get queue information for a player
   * @param userId - User ID
   * @returns Queue entry or null
   */
  getQueueInfo(userId: string): QueueEntry | null {
    return this.queue.get(userId) || null;
  }

  /**
   * Find a match for a player
   * @param userId - User ID
   * @returns Matchmaking result
   */
  async findMatch(userId: string): Promise<MatchmakingResult> {
    const player = this.queue.get(userId);
    
    if (!player) {
      return {
        matched: false,
        reason: 'Player is not in the matchmaking queue',
      };
    }

    if (this.queue.size < 2) {
      return {
        matched: false,
        reason: 'No suitable match found (not enough players in queue)',
      };
    }

    // Calculate current ELO range for this player (expands over time)
    const timeInQueue = Date.now() - player.joinedAt;
    const expansionIntervals = Math.floor(timeInQueue / this.eloRangeExpansionInterval);
    const currentEloRange = Math.min(
      this.defaultEloRange + expansionIntervals * this.eloRangeExpansionRate,
      this.maxEloRange
    );

    // Find best match (closest ELO within range)
    let bestMatch: QueueEntry | null = null;
    let smallestEloDiff = Infinity;

    for (const [otherUserId, otherPlayer] of this.queue.entries()) {
      if (otherUserId === userId) continue; // Skip self

      const eloDiff = Math.abs(player.elo - otherPlayer.elo);
      
      if (eloDiff <= currentEloRange && eloDiff < smallestEloDiff) {
        bestMatch = otherPlayer;
        smallestEloDiff = eloDiff;
      }
    }

    if (!bestMatch) {
      return {
        matched: false,
        reason: 'No suitable match found (no players within ELO range)',
      };
    }

    // Create game
    const gameId = await this.createMatch(userId, bestMatch.userId);

    // Remove both players from queue
    this.queue.delete(userId);
    this.queue.delete(bestMatch.userId);

    // Notify callbacks
    this.notifyMatchFound(userId, bestMatch.userId, gameId);

    return {
      matched: true,
      gameId,
      opponentId: bestMatch.userId,
    };
  }

  /**
   * Create a match between two players
   * Randomly assigns white and black
   * @param player1Id - First player ID
   * @param player2Id - Second player ID
   * @returns Game ID
   */
  private async createMatch(player1Id: string, player2Id: string): Promise<string> {
    // Randomly assign white and black
    const isPlayer1White = Math.random() < 0.5;
    const whiteId = isPlayer1White ? player1Id : player2Id;
    const blackId = isPlayer1White ? player2Id : player1Id;

    // Create rated game
    const gameId = await gameManager.createGame(whiteId, blackId, true); // true = rated

    return gameId;
  }

  /**
   * Start the matching loop that periodically checks for matches
   */
  private startMatchingLoop(): void {
    if (this.matchingInterval) {
      return;
    }

    this.matchingInterval = setInterval(async () => {
      // Try to match all players in queue
      const playersToMatch = Array.from(this.queue.keys());
      
      const matchedPlayers = new Set<string>();

      for (const userId of playersToMatch) {
        if (matchedPlayers.has(userId)) continue;

        const matchResult = await this.findMatch(userId);
        
        if (matchResult.matched) {
          matchedPlayers.add(userId);
          if (matchResult.opponentId) {
            matchedPlayers.add(matchResult.opponentId);
          }
        }
      }
    }, this.MATCHING_CHECK_INTERVAL);
  }

  /**
   * Stop the matching loop (for testing/cleanup)
   */
  stopMatchingLoop(): void {
    if (this.matchingInterval) {
      clearInterval(this.matchingInterval);
      this.matchingInterval = null;
    }
  }

  /**
   * Set the default ELO range for matching
   * @param range - ELO range (default: 200)
   */
  setEloRange(range: number): void {
    this.defaultEloRange = range;
  }

  /**
   * Get the current default ELO range
   * @returns ELO range
   */
  getEloRange(): number {
    return this.defaultEloRange;
  }

  /**
   * Set the maximum ELO range after expansion
   * @param maxRange - Maximum ELO range (default: 500)
   */
  setMaxEloRange(maxRange: number): void {
    this.maxEloRange = maxRange;
  }

  /**
   * Get all players currently in queue
   * @returns Array of user IDs
   */
  getQueuedPlayers(): string[] {
    return Array.from(this.queue.keys());
  }

  /**
   * Get queue statistics
   * @returns Object with queue statistics
   */
  getQueueStats(): {
    size: number;
    averageElo: number;
    minElo: number;
    maxElo: number;
  } {
    if (this.queue.size === 0) {
      return {
        size: 0,
        averageElo: 0,
        minElo: 0,
        maxElo: 0,
      };
    }

    const elos = Array.from(this.queue.values()).map(entry => entry.elo);
    const sum = elos.reduce((acc, elo) => acc + elo, 0);

    return {
      size: this.queue.size,
      averageElo: Math.round(sum / elos.length),
      minElo: Math.min(...elos),
      maxElo: Math.max(...elos),
    };
  }

  /**
   * Clear the entire queue (for testing/cleanup)
   */
  clearQueue(): void {
    this.queue.clear();
  }
}

// Export singleton instance
export const matchmakingManager = new MatchmakingManager();

