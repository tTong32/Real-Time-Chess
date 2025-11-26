import { gameManager } from './GameManager';
import prisma from '../config/database';
import { GameStatus } from '@prisma/client';

/**
 * Room information stored in memory
 */
export interface RoomInfo {
  roomCode: string;
  hostId: string;
  gameId: string;
  playerCount: number;
  createdAt: number;
}

/**
 * Result of joining a room
 */
export interface JoinRoomResult {
  success: boolean;
  gameId?: string;
  error?: string;
}

/**
 * RoomManager manages room-based games for friend matches
 * - Generates unique 6-character room codes
 * - Creates rooms when a player hosts
 * - Allows second player to join by room code
 * - Cleans up expired/abandoned rooms
 */
export class RoomManager {
  private rooms: Map<string, RoomInfo> = new Map();
  private readonly ROOM_CODE_LENGTH = 6;
  private readonly ROOM_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 24 hours in milliseconds
  private readonly CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate a unique 6-character alphanumeric room code
   * Uses uppercase letters and numbers (0-9, A-Z)
   * @returns Room code string
   */
  generateRoomCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    for (let i = 0; i < this.ROOM_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  /**
   * Create a new room with a unique code
   * @param hostId - User ID of the room host
   * @returns Room code
   */
  async createRoom(hostId: string): Promise<string> {
    // Generate unique room code
    let roomCode: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      roomCode = this.generateRoomCode();
      attempts++;
      
      // Check if code already exists in database or memory
      const existsInDb = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      if (!existsInDb && !this.rooms.has(roomCode)) {
        break;
      }
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code after multiple attempts');
    }

    // Create game with room code
    // Initially, set both players to hostId as placeholder until second player joins
    const gameId = await gameManager.createGame(
      hostId,
      hostId, // Placeholder - will be updated when second player joins
      false, // Room games are always unrated
      roomCode
    );

    // Store room info in memory
    const roomInfo: RoomInfo = {
      roomCode,
      hostId,
      gameId,
      playerCount: 1,
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, roomInfo);

    return roomCode;
  }

  /**
   * Join an existing room
   * @param roomCode - Room code to join
   * @param userId - User ID of the player joining
   * @returns Join result with game ID or error
   */
  async joinRoom(roomCode: string, userId: string): Promise<JoinRoomResult> {
    // Get room info from memory
    const roomInfo = this.rooms.get(roomCode);
    
    if (!roomInfo) {
      // Try to load from database (in case server restarted)
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });

      if (!game) {
        return {
          success: false,
          error: 'Room not found',
        };
      }

      if (game.status !== GameStatus.WAITING) {
        return {
          success: false,
          error: 'Room is no longer accepting players',
        };
      }

      // Check if already full (game has two different players)
      if (game.whiteId !== game.blackId) {
        return {
          success: false,
          error: 'Room is full',
        };
      }

      // Check if user is the host
      if (game.whiteId === userId) {
        return {
          success: false,
          error: 'You cannot join your own room',
        };
      }

      // Reconstruct room info from database
      const reconstructedRoomInfo: RoomInfo = {
        roomCode,
        hostId: game.whiteId,
        gameId: game.id,
        playerCount: 1,
        createdAt: game.createdAt.getTime(),
      };

      this.rooms.set(roomCode, reconstructedRoomInfo);

      // Update game with second player
      await this.updateGameWithSecondPlayer(game.id, userId);
      reconstructedRoomInfo.playerCount = 2;

      return {
        success: true,
        gameId: game.id,
      };
    }

    // Check if user is the host
    if (roomInfo.hostId === userId) {
      return {
        success: false,
        error: 'You cannot join your own room',
      };
    }

    // Check if room is full
    if (roomInfo.playerCount >= 2) {
      return {
        success: false,
        error: 'Room is full',
      };
    }

    // Update game with second player
    await this.updateGameWithSecondPlayer(roomInfo.gameId, userId);
    roomInfo.playerCount = 2;

    return {
      success: true,
      gameId: roomInfo.gameId,
    };
  }

  /**
   * Update game with second player (set blackId)
   * @param gameId - Game ID
   * @param secondPlayerId - User ID of second player
   */
  private async updateGameWithSecondPlayer(
    gameId: string,
    secondPlayerId: string
  ): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        blackId: secondPlayerId,
      },
    });
  }

  /**
   * Get room information
   * @param roomCode - Room code
   * @returns Room info or null if not found
   */
  getRoomInfo(roomCode: string): RoomInfo | null {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Check if a room exists
   * @param roomCode - Room code
   * @returns true if room exists
   */
  roomExists(roomCode: string): boolean {
    return this.rooms.has(roomCode);
  }

  /**
   * Delete a room and mark game as abandoned
   * @param roomCode - Room code
   */
  async deleteRoom(roomCode: string): Promise<void> {
    const roomInfo = this.rooms.get(roomCode);
    
    if (roomInfo) {
      // Mark game as abandoned
      await prisma.game.update({
        where: { id: roomInfo.gameId },
        data: {
          status: GameStatus.ABANDONED,
        },
      });

      // Remove from memory
      this.rooms.delete(roomCode);
    }
  }

  /**
   * Clean up expired rooms
   * Removes rooms that are older than expiry time and still in WAITING status
   */
  async cleanupExpiredRooms(): Promise<void> {
    const now = Date.now();
    const roomsToDelete: string[] = [];

    for (const [roomCode, roomInfo] of this.rooms.entries()) {
      const age = now - roomInfo.createdAt;
      
      if (age > this.ROOM_EXPIRY_TIME) {
        // Check game status in database
        const game = await prisma.game.findUnique({
          where: { id: roomInfo.gameId },
        });

        // Only cleanup if game is still waiting and has only one player
        if (
          game &&
          game.status === GameStatus.WAITING &&
          roomInfo.playerCount === 1
        ) {
          roomsToDelete.push(roomCode);
        }
      }
    }

    // Delete expired rooms
    for (const roomCode of roomsToDelete) {
      await this.deleteRoom(roomCode);
    }
  }

  /**
   * Start cleanup timer for periodic room cleanup
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRooms().catch((error) => {
        console.error('Error during room cleanup:', error);
      });
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (for testing/cleanup)
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all active rooms
   * @returns Array of room codes
   */
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Get room count
   * @returns Number of active rooms
   */
  getRoomCount(): number {
    return this.rooms.size;
  }
}

// Export singleton instance
export const roomManager = new RoomManager();

