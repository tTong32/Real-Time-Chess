import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, FriendshipStatus } from '@prisma/client';
import prisma from '../config/database';

describe('Friendship Model', () => {
  let user1: { id: string };
  let user2: { id: string };

  beforeAll(async () => {
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.friendship.deleteMany({});
    await prisma.user.deleteMany({});

    user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        passwordHash: 'hash',
      },
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        passwordHash: 'hash',
      },
    });
  });

  it('should create a friendship with pending status', async () => {
    const friendship = await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
        status: FriendshipStatus.PENDING,
      },
    });

    expect(friendship).toBeDefined();
    expect(friendship.senderId).toBe(user1.id);
    expect(friendship.receiverId).toBe(user2.id);
    expect(friendship.status).toBe(FriendshipStatus.PENDING);
  });

  it('should default status to PENDING', async () => {
    const friendship = await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
      },
    });

    expect(friendship.status).toBe(FriendshipStatus.PENDING);
  });

  it('should enforce unique sender-receiver pair', async () => {
    await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
      },
    });

    await expect(
      prisma.friendship.create({
        data: {
          senderId: user1.id,
          receiverId: user2.id,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow reverse friendship (user2 to user1)', async () => {
    await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
      },
    });

    const reverse = await prisma.friendship.create({
      data: {
        senderId: user2.id,
        receiverId: user1.id,
      },
    });

    expect(reverse).toBeDefined();
    expect(reverse.senderId).toBe(user2.id);
    expect(reverse.receiverId).toBe(user1.id);
  });

  it('should update friendship status', async () => {
    const friendship = await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
        status: FriendshipStatus.PENDING,
      },
    });

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: {
        status: FriendshipStatus.ACCEPTED,
      },
    });

    expect(updated.status).toBe(FriendshipStatus.ACCEPTED);
  });

  it('should cascade delete when sender is deleted', async () => {
    const friendship = await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
      },
    });

    await prisma.user.delete({
      where: { id: user1.id },
    });

    const deleted = await prisma.friendship.findUnique({
      where: { id: friendship.id },
    });

    expect(deleted).toBeNull();
  });

  it('should query friendships by sender', async () => {
    await prisma.friendship.create({
      data: {
        senderId: user1.id,
        receiverId: user2.id,
      },
    });

    const friendships = await prisma.friendship.findMany({
      where: { senderId: user1.id },
    });

    expect(friendships.length).toBe(1);
    expect(friendships[0].receiverId).toBe(user2.id);
  });
});

