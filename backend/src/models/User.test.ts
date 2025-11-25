import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import prisma from '../config/database';

describe('User Model', () => {
  beforeAll(async () => {
    // Ensure database is clean
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.user.deleteMany({});
  });

  it('should create a user with required fields', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        emailVerified: false,
        elo: 1000,
      },
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.elo).toBe(1000);
    expect(user.emailVerified).toBe(false);
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeDefined();
  });

  it('should enforce unique email constraint', async () => {
    await prisma.user.create({
      data: {
        email: 'duplicate@example.com',
        passwordHash: 'hash1',
      },
    });

    await expect(
      prisma.user.create({
        data: {
          email: 'duplicate@example.com',
          passwordHash: 'hash2',
        },
      })
    ).rejects.toThrow();
  });

  it('should default elo to 1000', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'defaultelo@example.com',
        passwordHash: 'hash',
      },
    });

    expect(user.elo).toBe(1000);
  });

  it('should default emailVerified to false', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'unverified@example.com',
        passwordHash: 'hash',
      },
    });

    expect(user.emailVerified).toBe(false);
  });

  it('should update user fields', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'update@example.com',
        passwordHash: 'hash',
        elo: 1000,
      },
    });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        elo: 1200,
        emailVerified: true,
      },
    });

    expect(updated.elo).toBe(1200);
    expect(updated.emailVerified).toBe(true);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
  });

  it('should delete user and cascade delete related records', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'delete@example.com',
        passwordHash: 'hash',
      },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    const deleted = await prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(deleted).toBeNull();
  });
});

