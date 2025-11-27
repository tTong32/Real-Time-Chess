import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import { errorHandler } from '../utils/errors';
import userRoutes from './users';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

describe('Users Routes', () => {
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let token1: string;
  let token2: string;

  beforeAll(async () => {
    // Clean up before tests
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up between tests
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash1',
        emailVerified: true,
        elo: 1200,
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash2',
        emailVerified: true,
        elo: 1100,
      },
    });

    // Generate tokens
    token1 = generateToken({ userId: user1.id, email: user1.email });
    token2 = generateToken({ userId: user2.id, email: user2.email });
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', user1.id);
      expect(res.body).toHaveProperty('email', user1.email);
      expect(res.body).toHaveProperty('elo', 1200);
      expect(res.body).toHaveProperty('emailVerified', true);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update user email', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'newemail@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'newemail@example.com');
      expect(res.body).toHaveProperty('id', user1.id);
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid email format');
    });

    it('should return 400 if email is already taken', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: user2.email });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already registered');
    });

    it('should return 400 if no fields to update', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No valid fields');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .send({ email: 'newemail@example.com' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/me/stats', () => {
    it('should return user statistics with empty stats', async () => {
      const res = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('elo', 1200);
      expect(res.body).toHaveProperty('totalGames', 0);
      expect(res.body).toHaveProperty('wins', 0);
      expect(res.body).toHaveProperty('losses', 0);
      expect(res.body).toHaveProperty('winRate', 0);
      expect(res.body).toHaveProperty('ratedGames', 0);
      expect(res.body).toHaveProperty('ratedWins', 0);
      expect(res.body).toHaveProperty('totalMoves', 0);
      expect(res.body).toHaveProperty('recentGames');
      expect(Array.isArray(res.body.recentGames)).toBe(true);
    });

    it('should calculate statistics correctly', async () => {
      // Create some games
      const game1 = await prisma.game.create({
        data: {
          whiteId: user1.id,
          blackId: user2.id,
          status: 'FINISHED',
          winnerId: user1.id,
          isRated: true,
          boardState: {},
          whiteState: {},
          blackState: {},
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      const game2 = await prisma.game.create({
        data: {
          whiteId: user2.id,
          blackId: user1.id,
          status: 'FINISHED',
          winnerId: user2.id,
          isRated: true,
          boardState: {},
          whiteState: {},
          blackState: {},
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      const game3 = await prisma.game.create({
        data: {
          whiteId: user1.id,
          blackId: user2.id,
          status: 'FINISHED',
          winnerId: user1.id,
          isRated: false,
          boardState: {},
          whiteState: {},
          blackState: {},
          startedAt: new Date(),
          endedAt: new Date(),
        },
      });

      // Create some moves
      await prisma.move.createMany({
        data: [
          {
            gameId: game1.id,
            playerId: user1.id,
            fromRow: 6,
            fromCol: 4,
            toRow: 4,
            toCol: 4,
            pieceType: 'pawn',
            energyCost: 2,
          },
          {
            gameId: game2.id,
            playerId: user1.id,
            fromRow: 6,
            fromCol: 4,
            toRow: 4,
            toCol: 4,
            pieceType: 'pawn',
            energyCost: 2,
          },
        ],
      });

      const res = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.totalGames).toBe(3);
      expect(res.body.wins).toBe(2); // Won game1 and game3
      expect(res.body.losses).toBe(1); // Lost game2
      expect(res.body.winRate).toBeCloseTo(66.67, 1);
      expect(res.body.ratedGames).toBe(2); // game1 and game2
      expect(res.body.ratedWins).toBe(1); // Won game1
      expect(res.body.totalMoves).toBe(2);
      expect(res.body.recentGames).toHaveLength(3);
    });

    it('should only count FINISHED games', async () => {
      await prisma.game.create({
        data: {
          whiteId: user1.id,
          blackId: user2.id,
          status: 'ACTIVE',
          boardState: {},
          whiteState: {},
          blackState: {},
          startedAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/users/me/stats')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.totalGames).toBe(0); // Active games not counted in stats
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/users/me/stats');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return public user profile', async () => {
      const res = await request(app)
        .get(`/api/users/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', user2.id);
      expect(res.body).toHaveProperty('elo', 1100);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).not.toHaveProperty('email'); // Email should not be exposed
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('totalGames');
      expect(res.body.stats).toHaveProperty('wins');
      expect(res.body.stats).toHaveProperty('losses');
    });

    it('should return 404 if user does not exist', async () => {
      const res = await request(app)
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get(`/api/users/${user2.id}`);

      expect(res.status).toBe(401);
    });
  });
});

