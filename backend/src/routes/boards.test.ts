import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import { PieceType } from '../game/types';
import { errorHandler } from '../utils/errors';
import boardRoutes from './boards';

describe('Custom Board Routes', () => {
  let app: express.Application;
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let user1Token: string;
  let user2Token: string;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/boards', boardRoutes);
    app.use(errorHandler);
  });

  beforeAll(async () => {
    // Clean up
    await prisma.customBoard.deleteMany({});
    await prisma.user.deleteMany({});

    // Create test users
    user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        passwordHash: 'hash1',
        emailVerified: true,
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        passwordHash: 'hash2',
        emailVerified: true,
      },
    });

    user1Token = generateToken({ userId: user1.id, email: user1.email });
    user2Token = generateToken({ userId: user2.id, email: user2.email });
  });

  afterAll(async () => {
    await prisma.customBoard.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.customBoard.deleteMany({});
  });

  describe('GET /api/boards', () => {
    it('should return empty array when user has no boards', async () => {
      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all boards for authenticated user', async () => {
      // Create boards for user1
      const board1 = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'Board 1',
          boardData: [],
        },
      });

      const board2 = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'Board 2',
          boardData: [],
        },
      });

      // Create board for user2 (should not appear)
      await prisma.customBoard.create({
        data: {
          userId: user2.id,
          name: 'Other User Board',
          boardData: [],
        },
      });

      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((b: any) => b.id)).toContain(board1.id);
      expect(response.body.map((b: any) => b.id)).toContain(board2.id);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/boards')
        .expect(401);
    });
  });

  describe('GET /api/boards/:id', () => {
    it('should return a specific board for the owner', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'My Board',
          boardData: [{ type: 'pawn', color: 'white', row: 6, col: 0 }] as any,
        },
      });

      const response = await request(app)
        .get(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.id).toBe(board.id);
      expect(response.body.name).toBe('My Board');
      expect(response.body.userId).toBe(user1.id);
    });

    it('should return 404 for non-existent board', async () => {
      await request(app)
        .get('/api/boards/non-existent-id')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 403 for board owned by another user', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user2.id,
          name: 'Other User Board',
          boardData: [],
        },
      });

      await request(app)
        .get(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/boards/some-id')
        .expect(401);
    });
  });

  describe('POST /api/boards', () => {
    it('should create a new custom board', async () => {
      const boardData = [
        { type: 'pawn', color: 'white', row: 6, col: 0 },
        { type: 'rook', color: 'white', row: 7, col: 0 },
      ];

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'New Board',
          boardData,
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Board');
      expect(response.body.userId).toBe(user1.id);
      expect(response.body.boardData).toEqual(boardData);

      // Verify it was saved to database
      const saved = await prisma.customBoard.findUnique({
        where: { id: response.body.id },
      });
      expect(saved).toBeDefined();
      expect(saved?.name).toBe('New Board');
    });

    it('should validate board data format', async () => {
      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Invalid Board',
          boardData: 'not an array',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate board using validateCustomBoard', async () => {
      // Create invalid board (king not in correct position)
      const invalidBoard = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      invalidBoard[0][0] = 'king'; // King in wrong position

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Invalid Board',
          boardData: invalidBoard,
        })
        .expect(400);

      expect(response.body.error).toContain('King');
    });

    it('should require name', async () => {
      await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          boardData: [],
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/boards')
        .send({
          name: 'Test',
          boardData: [],
        })
        .expect(401);
    });
  });

  describe('PUT /api/boards/:id', () => {
    it('should update an existing board', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'Original Name',
          boardData: [],
        },
      });

      const newBoardData = [
        { type: 'knight', color: 'white', row: 7, col: 1 },
      ];

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated Name',
          boardData: newBoardData,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.boardData).toEqual(newBoardData);

      // Verify update in database
      const updated = await prisma.customBoard.findUnique({
        where: { id: board.id },
      });
      expect(updated?.name).toBe('Updated Name');
    });

    it('should allow partial updates', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'Original Name',
          boardData: [],
        },
      });

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated Name Only',
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name Only');
    });

    it('should validate board data on update', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'Valid Board',
          boardData: [],
        },
      });

      const invalidBoard = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      invalidBoard[1][1] = 'king'; // Invalid king position

      await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          boardData: invalidBoard,
        })
        .expect(400);
    });

    it('should return 404 for non-existent board', async () => {
      await request(app)
        .put('/api/boards/non-existent-id')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Updated',
        })
        .expect(404);
    });

    it('should return 403 for board owned by another user', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user2.id,
          name: 'Other User Board',
          boardData: [],
        },
      });

      await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Hacked',
        })
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/boards/some-id')
        .send({
          name: 'Test',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/boards/:id', () => {
    it('should delete a board owned by the user', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user1.id,
          name: 'To Delete',
          boardData: [],
        },
      });

      await request(app)
        .delete(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Verify deletion
      const deleted = await prisma.customBoard.findUnique({
        where: { id: board.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent board', async () => {
      await request(app)
        .delete('/api/boards/non-existent-id')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('should return 403 for board owned by another user', async () => {
      const board = await prisma.customBoard.create({
        data: {
          userId: user2.id,
          name: 'Other User Board',
          boardData: [],
        },
      });

      await request(app)
        .delete(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/boards/some-id')
        .expect(401);
    });
  });

  describe('POST /api/boards/validate', () => {
    it('should validate a valid board configuration', async () => {
      const validBoard = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      // Place kings in correct positions
      validBoard[0][4] = 'king'; // Black king
      validBoard[7][4] = 'king'; // White king

      const response = await request(app)
        .post('/api/boards/validate')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ boardData: validBoard })
        .expect(200);

      expect(response.body.valid).toBe(true);
    });

    it('should reject invalid board (wrong size)', async () => {
      const invalidBoard = Array(7).fill(null).map(() => Array(8).fill(null));

      const response = await request(app)
        .post('/api/boards/validate')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ boardData: invalidBoard })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid board (king in wrong position)', async () => {
      const invalidBoard = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      invalidBoard[1][1] = 'king'; // King in wrong position

      const response = await request(app)
        .post('/api/boards/validate')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ boardData: invalidBoard })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('King');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/boards/validate')
        .send({ boardData: [] })
        .expect(401);
    });
  });
});

