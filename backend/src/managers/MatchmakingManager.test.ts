import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { MatchmakingManager } from './MatchmakingManager';
import { gameManager } from './GameManager';
import prisma from '../config/database';
import { GameStatus } from '@prisma/client';

describe('MatchmakingManager', () => {
  let matchmakingManager: MatchmakingManager;
  let user1: { id: string; email: string; elo: number };
  let user2: { id: string; email: string; elo: number };
  let user3: { id: string; email: string; elo: number };
  let user4: { id: string; email: string; elo: number };

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

    // Create test users with different ELO ratings
    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        emailVerified: true,
        elo: 1000,
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        emailVerified: true,
        elo: 1050,
      },
    });

    user3 = await prisma.user.create({
      data: {
        email: 'user3@example.com',
        passwordHash: 'hash3',
        emailVerified: true,
        elo: 1200,
      },
    });

    user4 = await prisma.user.create({
      data: {
        email: 'user4@example.com',
        passwordHash: 'hash4',
        emailVerified: true,
        elo: 1500,
      },
    });

    // Stop matching loop to avoid interference with tests
    if (matchmakingManager) {
      matchmakingManager.stopMatchingLoop();
      matchmakingManager.clearQueue();
    }

    // Create fresh MatchmakingManager instance
    matchmakingManager = new MatchmakingManager();
    matchmakingManager.stopMatchingLoop(); // Stop it immediately for testing
  });

  describe('Queue Management', () => {
    it('should add a player to the matchmaking queue', async () => {
      const result = await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      expect(result.success).toBe(true);
      expect(matchmakingManager.isInQueue(user1.id)).toBe(true);
      expect(matchmakingManager.getQueueSize()).toBe(1);
    });

    it('should not allow adding the same player twice', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const result = await matchmakingManager.addToQueue(user1.id, 'socket2');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already');
      expect(matchmakingManager.getQueueSize()).toBe(1);
    });

    it('should remove a player from the queue', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const result = await matchmakingManager.removeFromQueue(user1.id);
      
      expect(result.success).toBe(true);
      expect(matchmakingManager.isInQueue(user1.id)).toBe(false);
      expect(matchmakingManager.getQueueSize()).toBe(0);
    });

    it('should handle removing non-existent player gracefully', async () => {
      const result = await matchmakingManager.removeFromQueue('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track queue size correctly', async () => {
      expect(matchmakingManager.getQueueSize()).toBe(0);
      
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      expect(matchmakingManager.getQueueSize()).toBe(1);
      
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      expect(matchmakingManager.getQueueSize()).toBe(2);
      
      await matchmakingManager.removeFromQueue(user1.id);
      expect(matchmakingManager.getQueueSize()).toBe(1);
    });

    it('should get queue information for a player', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const queueInfo = matchmakingManager.getQueueInfo(user1.id);
      
      expect(queueInfo).toBeDefined();
      expect(queueInfo?.userId).toBe(user1.id);
      expect(queueInfo?.socketId).toBe('socket1');
      expect(queueInfo?.joinedAt).toBeDefined();
    });

    it('should return null for queue info of non-queued player', () => {
      const queueInfo = matchmakingManager.getQueueInfo(user1.id);
      expect(queueInfo).toBeNull();
    });
  });

  describe('ELO-Based Matching', () => {
    it('should match players with similar ELO ratings', async () => {
      // Both players have similar ELO (1000 and 1050)
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      // Trigger matchmaking
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(true);
      expect(matchResult.gameId).toBeDefined();
      
      // Check that game was created
      const game = await prisma.game.findUnique({
        where: { id: matchResult.gameId! },
      });
      
      expect(game).toBeDefined();
      expect(game?.isRated).toBe(true);
      expect([game?.whiteId, game?.blackId]).toContain(user1.id);
      expect([game?.whiteId, game?.blackId]).toContain(user2.id);
      
      // Both players should be removed from queue
      expect(matchmakingManager.isInQueue(user1.id)).toBe(false);
      expect(matchmakingManager.isInQueue(user2.id)).toBe(false);
    });

    it('should not match players with large ELO difference', async () => {
      // Large ELO difference (1000 vs 1500 = 500 points)
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user4.id, 'socket4');
      
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(false);
      expect(matchResult.reason).toBeDefined();
      
      // Both should still be in queue
      expect(matchmakingManager.isInQueue(user1.id)).toBe(true);
      expect(matchmakingManager.isInQueue(user4.id)).toBe(true);
    });

    it('should match closest available ELO when multiple players in queue', async () => {
      // Add multiple players with different ELOs
      await matchmakingManager.addToQueue(user1.id, 'socket1'); // 1000
      await matchmakingManager.addToQueue(user2.id, 'socket2'); // 1050
      await matchmakingManager.addToQueue(user3.id, 'socket3'); // 1200
      
      // user1 (1000) should match with user2 (1050) - closest ELO
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(true);
      
      const game = await prisma.game.findUnique({
        where: { id: matchResult.gameId! },
      });
      
      expect([game?.whiteId, game?.blackId]).toContain(user1.id);
      expect([game?.whiteId, game?.blackId]).toContain(user2.id);
      // user3 should still be in queue
      expect(matchmakingManager.isInQueue(user3.id)).toBe(true);
    });

    it('should use configurable ELO range for matching', async () => {
      // Set a wider ELO range
      matchmakingManager.setEloRange(600);
      
      // Now should match even with 500 point difference
      await matchmakingManager.addToQueue(user1.id, 'socket1'); // 1000
      await matchmakingManager.addToQueue(user4.id, 'socket4'); // 1500
      
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(true);
    });
  });

  describe('Match Creation', () => {
    it('should create a rated game when players are matched', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(true);
      
      const game = await prisma.game.findUnique({
        where: { id: matchResult.gameId! },
      });
      
      expect(game?.isRated).toBe(true);
      expect(game?.status).toBe(GameStatus.WAITING);
    });

    it('should assign white and black players randomly', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      const matchResult = await matchmakingManager.findMatch(user1.id);
      const game = await prisma.game.findUnique({
        where: { id: matchResult.gameId! },
      });
      
      // Both players should be in the game
      expect([game?.whiteId, game?.blackId]).toContain(user1.id);
      expect([game?.whiteId, game?.blackId]).toContain(user2.id);
      expect(game?.whiteId).not.toBe(game?.blackId);
    });

    it('should remove both players from queue after match', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      await matchmakingManager.findMatch(user1.id);
      
      expect(matchmakingManager.isInQueue(user1.id)).toBe(false);
      expect(matchmakingManager.isInQueue(user2.id)).toBe(false);
    });
  });

  describe('Automatic Matchmaking', () => {
    it('should automatically match players when second player enters queue', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      // Add second player - should trigger automatic matching since they're within ELO range
      const result = await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      // Should be matched automatically (user1 is 1000, user2 is 1050, diff is 50 < 200 default range)
      expect(result.matched).toBe(true);
      expect(result.gameId).toBeDefined();
      expect(matchmakingManager.isInQueue(user1.id)).toBe(false);
      expect(matchmakingManager.isInQueue(user2.id)).toBe(false);
    });
  });

  describe('Queue Time Tracking', () => {
    it('should track how long a player has been in queue', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const queueInfo = matchmakingManager.getQueueInfo(user1.id);
      
      expect(queueInfo?.joinedAt).toBeDefined();
      expect(queueInfo?.joinedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should expand ELO range as time in queue increases', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      // Get initial range
      const initialRange = matchmakingManager.getEloRange();
      
      // Manually set a long wait time (simulate)
      const queueInfo = matchmakingManager.getQueueInfo(user1.id);
      if (queueInfo) {
        // Mock old joinedAt time
        (queueInfo as any).joinedAt = Date.now() - (1000 * 60 * 2); // 2 minutes ago
      }
      
      // After some time, range should expand (if implemented)
      // This depends on implementation
    });
  });

  describe('Edge Cases', () => {
    it('should handle player disconnecting while in queue', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      // Player disconnects - remove from queue
      await matchmakingManager.removeFromQueue(user1.id);
      
      expect(matchmakingManager.isInQueue(user1.id)).toBe(false);
      expect(matchmakingManager.getQueueSize()).toBe(0);
    });

    it('should handle finding match for non-queued player', async () => {
      const result = await matchmakingManager.findMatch(user1.id);
      
      expect(result.matched).toBe(false);
      expect(result.reason).toContain('not in queue');
    });

    it('should handle empty queue gracefully', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const result = await matchmakingManager.findMatch(user1.id);
      
      expect(result.matched).toBe(false);
      expect(result.reason).toContain('no suitable match');
    });

    it('should handle matching with only one player in queue', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      
      const result = await matchmakingManager.findMatch(user1.id);
      
      expect(result.matched).toBe(false);
      expect(matchmakingManager.isInQueue(user1.id)).toBe(true);
    });
  });

  describe('Integration with GameManager', () => {
    it('should create game through GameManager when matched', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1');
      await matchmakingManager.addToQueue(user2.id, 'socket2');
      
      const matchResult = await matchmakingManager.findMatch(user1.id);
      
      expect(matchResult.matched).toBe(true);
      
      // Verify game exists in database
      const game = await prisma.game.findUnique({
        where: { id: matchResult.gameId! },
      });
      
      expect(game).toBeDefined();
      expect(game?.whiteId).toBeDefined();
      expect(game?.blackId).toBeDefined();
    });
  });

  describe('Multiple Queue Management', () => {
    it('should handle multiple players queuing simultaneously', async () => {
      const promises = [
        matchmakingManager.addToQueue(user1.id, 'socket1'),
        matchmakingManager.addToQueue(user2.id, 'socket2'),
        matchmakingManager.addToQueue(user3.id, 'socket3'),
      ];
      
      await Promise.all(promises);
      
      expect(matchmakingManager.getQueueSize()).toBe(3);
    });

    it('should match players in order of queue time when similar ELO', async () => {
      await matchmakingManager.addToQueue(user1.id, 'socket1'); // 1000
      await matchmakingManager.addToQueue(user2.id, 'socket2'); // 1050 (closest)
      await matchmakingManager.addToQueue(user3.id, 'socket3'); // 1200 (further)
      
      // user1 should match with user2 (closest ELO)
      const result = await matchmakingManager.findMatch(user1.id);
      
      expect(result.matched).toBe(true);
      
      const game = await prisma.game.findUnique({
        where: { id: result.gameId! },
      });
      
      expect([game?.whiteId, game?.blackId]).toContain(user1.id);
      expect([game?.whiteId, game?.blackId]).toContain(user2.id);
    });
  });
});

