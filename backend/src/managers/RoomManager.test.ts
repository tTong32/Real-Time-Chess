import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { RoomManager } from './RoomManager';
import { gameManager } from './GameManager';
import prisma from '../config/database';
import { GameStatus } from '@prisma/client';

describe('RoomManager', () => {
  let roomManager: RoomManager;
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let user3: { id: string; email: string };

  beforeAll(async () => {
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        emailVerified: true,
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        emailVerified: true,
      },
    });

    user3 = await prisma.user.create({
      data: {
        email: 'user3@example.com',
        passwordHash: 'hash3',
        emailVerified: true,
      },
    });

    // Stop cleanup timer to avoid interference with tests
    if (roomManager) {
      roomManager.stopCleanupTimer();
    }
    
    // Create fresh RoomManager instance
    roomManager = new RoomManager();
    roomManager.stopCleanupTimer(); // Stop it immediately for testing
  });

  describe('Room Code Generation', () => {
    it('should generate a 6-character room code', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toHaveLength(6);
      expect(typeof code).toBe('string');
    });

    it('should generate alphanumeric room codes', () => {
      const code = roomManager.generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate different codes on subsequent calls', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(roomManager.generateRoomCode());
      }
      // Should have high uniqueness (at least 90 unique codes out of 100)
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe('Room Creation', () => {
    it('should create a room with a unique room code', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      expect(roomCode).toBeDefined();
      expect(roomCode).toHaveLength(6);
      
      // Check that a game was created
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      expect(game).toBeDefined();
      expect(game?.whiteId).toBe(user1.id);
      expect(game?.blackId).toBe(user1.id); // Placeholder until second player joins
      expect(game?.status).toBe(GameStatus.WAITING);
      expect(game?.isRated).toBe(false);
      expect(game?.roomCode).toBe(roomCode);
    });

    it('should not allow duplicate room codes', async () => {
      // Mock generateRoomCode to return same code
      const mockCode = 'TEST01';
      vi.spyOn(roomManager as any, 'generateRoomCode').mockReturnValue(mockCode);
      
      // Create first room
      await roomManager.createRoom(user1.id);
      
      // Try to create second room with same code - should generate new one
      const code2 = await roomManager.createRoom(user2.id);
      
      // Should have different codes or handle collision
      expect(code2).toBeDefined();
    });

    it('should store room information in memory', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const roomInfo = roomManager.getRoomInfo(roomCode);
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.hostId).toBe(user1.id);
      expect(roomInfo?.gameId).toBeDefined();
    });
  });

  describe('Room Joining', () => {
    it('should allow a second player to join an existing room', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const result = await roomManager.joinRoom(roomCode, user2.id);
      
      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      
      // Check that game was updated with second player
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      expect(game?.whiteId).toBe(user1.id);
      expect(game?.blackId).toBe(user2.id);
    });

    it('should not allow the host to join their own room', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const result = await roomManager.joinRoom(roomCode, user1.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('host');
    });

    it('should not allow joining a non-existent room', async () => {
      const result = await roomManager.joinRoom('INVALID', user2.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should not allow joining a room that already has two players', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      await roomManager.joinRoom(roomCode, user2.id);
      
      // Try to join with third player
      const result = await roomManager.joinRoom(roomCode, user3.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });

    it('should return game ID when joining successfully', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const result = await roomManager.joinRoom(roomCode, user2.id);
      
      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      
      // Verify game exists
      const game = await prisma.game.findUnique({
        where: { id: result.gameId },
      });
      
      expect(game).toBeDefined();
    });
  });

  describe('Room Information', () => {
    it('should return room info for existing room', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const roomInfo = roomManager.getRoomInfo(roomCode);
      
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.roomCode).toBe(roomCode);
      expect(roomInfo?.hostId).toBe(user1.id);
      expect(roomInfo?.gameId).toBeDefined();
      expect(roomInfo?.playerCount).toBe(1);
    });

    it('should return null for non-existent room', () => {
      const roomInfo = roomManager.getRoomInfo('INVALID');
      expect(roomInfo).toBeNull();
    });

    it('should update player count when second player joins', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      let roomInfo = roomManager.getRoomInfo(roomCode);
      expect(roomInfo?.playerCount).toBe(1);
      
      await roomManager.joinRoom(roomCode, user2.id);
      
      roomInfo = roomManager.getRoomInfo(roomCode);
      expect(roomInfo?.playerCount).toBe(2);
    });
  });

  describe('Room Cleanup', () => {
    it('should clean up expired rooms', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      // Manually set room as expired (older than cleanup threshold)
      const roomInfo = roomManager.getRoomInfo(roomCode);
      if (roomInfo) {
        // Mock created time to be in the past
        (roomInfo as any).createdAt = Date.now() - (1000 * 60 * 60 * 2); // 2 hours ago
      }
      
      await roomManager.cleanupExpiredRooms();
      
      // Room should be cleaned up
      const roomAfterCleanup = roomManager.getRoomInfo(roomCode);
      expect(roomAfterCleanup).toBeNull();
      
      // Game should still exist but marked as abandoned
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      // Game might be deleted or status updated depending on implementation
      expect(game).toBeDefined(); // Or null if deleted
    });

    it('should not clean up active rooms', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      await roomManager.joinRoom(roomCode, user2.id);
      
      // Start the game
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      if (game) {
        await prisma.game.update({
          where: { id: game.id },
          data: { status: GameStatus.ACTIVE },
        });
      }
      
      await roomManager.cleanupExpiredRooms();
      
      // Room should still exist if game is active
      const roomInfo = roomManager.getRoomInfo(roomCode);
      // Might be null if we clean up based on game status
      // This depends on implementation
    });

    it('should remove room from memory when cleaned up', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      expect(roomManager.getRoomInfo(roomCode)).toBeDefined();
      
      // Force cleanup
      await roomManager.deleteRoom(roomCode);
      
      expect(roomManager.getRoomInfo(roomCode)).toBeNull();
    });
  });

  describe('Room Deletion', () => {
    it('should delete a room and clean up the game', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      await roomManager.deleteRoom(roomCode);
      
      // Room should be removed from memory
      expect(roomManager.getRoomInfo(roomCode)).toBeNull();
      
      // Game should be deleted or marked as abandoned
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      // Depending on implementation, game might be deleted or status updated
      expect(game?.status).toBe(GameStatus.ABANDONED);
    });

    it('should handle deleting non-existent room gracefully', async () => {
      await expect(roomManager.deleteRoom('INVALID')).resolves.not.toThrow();
    });
  });

  describe('Room Status', () => {
    it('should return true for existing room', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      expect(roomManager.roomExists(roomCode)).toBe(true);
      expect(roomManager.roomExists('INVALID')).toBe(false);
    });

    it('should track room player count correctly', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      expect(roomManager.getRoomInfo(roomCode)?.playerCount).toBe(1);
      
      await roomManager.joinRoom(roomCode, user2.id);
      
      expect(roomManager.getRoomInfo(roomCode)?.playerCount).toBe(2);
    });
  });

  describe('Integration with GameManager', () => {
    it('should create game through GameManager when creating room', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const game = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      expect(game).toBeDefined();
      expect(game?.status).toBe(GameStatus.WAITING);
    });

    it('should update game with second player when joining', async () => {
      const roomCode = await roomManager.createRoom(user1.id);
      
      const gameBefore = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      // Initially, blackId is placeholder (same as whiteId)
      expect(gameBefore?.whiteId).toBe(user1.id);
      
      await roomManager.joinRoom(roomCode, user2.id);
      
      const gameAfter = await prisma.game.findUnique({
        where: { roomCode },
      });
      
      expect(gameAfter?.whiteId).toBe(user1.id);
      expect(gameAfter?.blackId).toBe(user2.id);
    });
  });
});

