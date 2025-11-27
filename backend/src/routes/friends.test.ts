import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient, FriendshipStatus } from '@prisma/client';
import prisma from '../config/database';
import friendsRoutes from './friends';
import { generateToken } from '../utils/jwt';
import { errorHandler } from '../utils/errors';

const app = express();
app.use(express.json());
app.use('/api/friends', friendsRoutes);
app.use(errorHandler);

describe('Friends Routes', () => {
  let user1: { id: string; email: string };
  let user2: { id: string; email: string };
  let user3: { id: string; email: string };
  let token1: string;
  let token2: string;
  let token3: string;

  beforeAll(async () => {
    // Clean up before tests
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up between tests
    await prisma.friendship.deleteMany({});
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

    // Generate tokens
    token1 = generateToken({ userId: user1.id, email: user1.email });
    token2 = generateToken({ userId: user2.id, email: user2.email });
    token3 = generateToken({ userId: user3.id, email: user3.email });
  });

  describe('POST /api/friends/send', () => {
    it('should send a friend request', async () => {
      const res = await request(app)
        .post('/api/friends/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.senderId).toBe(user1.id);
      expect(res.body.receiverId).toBe(user2.id);
      expect(res.body.status).toBe(FriendshipStatus.PENDING);
    });

    it('should return 400 if trying to send request to self', async () => {
      const res = await request(app)
        .post('/api/friends/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user1.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('yourself');
    });

    it('should return 404 if user does not exist', async () => {
      const res = await request(app)
        .post('/api/friends/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: 'non-existent-id' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 400 if friendship already exists', async () => {
      // Create existing friendship
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .post('/api/friends/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already exists');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/friends/send')
        .send({ userId: user2.id });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/friends/accept', () => {
    it('should accept a friend request', async () => {
      // Create pending friendship
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .post('/api/friends/accept')
        .set('Authorization', `Bearer ${token2}`)
        .send({ friendshipId: friendship.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('should return 404 if friendship does not exist', async () => {
      const res = await request(app)
        .post('/api/friends/accept')
        .set('Authorization', `Bearer ${token2}`)
        .send({ friendshipId: 'non-existent-id' });

      expect(res.status).toBe(404);
    });

    it('should return 403 if user is not the receiver', async () => {
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .post('/api/friends/accept')
        .set('Authorization', `Bearer ${token1}`) // user1 trying to accept their own request
        .send({ friendshipId: friendship.id });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not authorized');
    });

    it('should return 400 if friendship is already accepted', async () => {
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const res = await request(app)
        .post('/api/friends/accept')
        .set('Authorization', `Bearer ${token2}`)
        .send({ friendshipId: friendship.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already accepted');
    });
  });

  describe('POST /api/friends/reject', () => {
    it('should reject a friend request', async () => {
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .post('/api/friends/reject')
        .set('Authorization', `Bearer ${token2}`)
        .send({ friendshipId: friendship.id });

      expect(res.status).toBe(200);
      // Rejection should delete the friendship
      const deleted = await prisma.friendship.findUnique({
        where: { id: friendship.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 if friendship does not exist', async () => {
      const res = await request(app)
        .post('/api/friends/reject')
        .set('Authorization', `Bearer ${token2}`)
        .send({ friendshipId: 'non-existent-id' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/friends/remove', () => {
    it('should remove an accepted friendship', async () => {
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const res = await request(app)
        .post('/api/friends/remove')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(res.status).toBe(200);
      const deleted = await prisma.friendship.findUnique({
        where: { id: friendship.id },
      });
      expect(deleted).toBeNull();
    });

    it('should allow either party to remove friendship', async () => {
      const friendship = await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const res = await request(app)
        .post('/api/friends/remove')
        .set('Authorization', `Bearer ${token2}`) // receiver removing
        .send({ userId: user1.id });

      expect(res.status).toBe(200);
      const deleted = await prisma.friendship.findUnique({
        where: { id: friendship.id },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 if friendship does not exist', async () => {
      const res = await request(app)
        .post('/api/friends/remove')
        .set('Authorization', `Bearer ${token1}`)
        .send({ userId: user2.id });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/friends', () => {
    it('should return list of accepted friends', async () => {
      // Create accepted friendships
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user3.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      // Create pending (should not appear)
      await prisma.friendship.create({
        data: {
          senderId: user2.id,
          receiverId: user3.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('friends');
      expect(res.body.friends).toHaveLength(2);
      expect(res.body.friends[0]).toHaveProperty('id');
      expect(res.body.friends[0]).toHaveProperty('elo');
      expect(res.body.friends[0]).not.toHaveProperty('email'); // Should not expose email
    });

    it('should return empty list if no friends', async () => {
      const res = await request(app)
        .get('/api/friends')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.friends).toHaveLength(0);
    });
  });

  describe('GET /api/friends/pending', () => {
    it('should return pending friend requests received by user', async () => {
      // Create pending requests
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      await prisma.friendship.create({
        data: {
          senderId: user3.id,
          receiverId: user2.id,
          status: FriendshipStatus.PENDING,
        },
      });

      // Create accepted (should not appear)
      await prisma.friendship.create({
        data: {
          senderId: user2.id,
          receiverId: user1.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const res = await request(app)
        .get('/api/friends/pending')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('pendingRequests');
      expect(res.body.pendingRequests).toHaveLength(2);
      expect(res.body.pendingRequests[0]).toHaveProperty('sender');
    });

    it('should not return requests sent by the user', async () => {
      await prisma.friendship.create({
        data: {
          senderId: user2.id,
          receiverId: user1.id,
          status: FriendshipStatus.PENDING,
        },
      });

      const res = await request(app)
        .get('/api/friends/pending')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.pendingRequests).toHaveLength(0);
    });
  });

  describe('GET /api/friends/search', () => {
    it('should search for users by email', async () => {
      const res = await request(app)
        .get('/api/friends/search')
        .query({ email: 'user2' })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('users');
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users[0]).toHaveProperty('id');
      expect(res.body.users[0]).toHaveProperty('elo');
      expect(res.body.users[0]).not.toHaveProperty('email');
    });

    it('should exclude current user from results', async () => {
      const res = await request(app)
        .get('/api/friends/search')
        .query({ email: 'user1' })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const foundSelf = res.body.users.some((u: any) => u.id === user1.id);
      expect(foundSelf).toBe(false);
    });

    it('should exclude existing friends from results', async () => {
      await prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
          status: FriendshipStatus.ACCEPTED,
        },
      });

      const res = await request(app)
        .get('/api/friends/search')
        .query({ email: 'user2' })
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const foundFriend = res.body.users.some((u: any) => u.id === user2.id);
      expect(foundFriend).toBe(false);
    });

    it('should return 400 if no email query parameter', async () => {
      const res = await request(app)
        .get('/api/friends/search')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(400);
    });
  });
});

