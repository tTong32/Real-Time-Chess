import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, GameStatus } from '@prisma/client';
import prisma from '../config/database';

describe('Game Model', () => {
  let whiteUser: { id: string };
  let blackUser: { id: string };

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
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});

    whiteUser = await prisma.user.create({
      data: {
        email: 'white@example.com',
        passwordHash: 'hash',
      },
    });

    blackUser = await prisma.user.create({
      data: {
        email: 'black@example.com',
        passwordHash: 'hash',
      },
    });
  });

  it('should create a game with required fields', async () => {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.WAITING,
        boardState: [],
        whiteState: { energy: 6, energyRegenRate: 0.5, lastEnergyUpdate: Date.now(), pieceCooldowns: {} },
        blackState: { energy: 6, energyRegenRate: 0.5, lastEnergyUpdate: Date.now(), pieceCooldowns: {} },
      },
    });

    expect(game).toBeDefined();
    expect(game.whiteId).toBe(whiteUser.id);
    expect(game.blackId).toBe(blackUser.id);
    expect(game.status).toBe(GameStatus.WAITING);
    expect(game.isRated).toBe(false);
    expect(game.id).toBeDefined();
  });

  it('should create a game with room code', async () => {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.WAITING,
        roomCode: 'ABC123',
        boardState: [],
        whiteState: {},
        blackState: {},
      },
    });

    expect(game.roomCode).toBe('ABC123');
  });

  it('should enforce unique room code', async () => {
    await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.WAITING,
        roomCode: 'UNIQUE1',
        boardState: [],
        whiteState: {},
        blackState: {},
      },
    });

    await expect(
      prisma.game.create({
        data: {
          whiteId: whiteUser.id,
          blackId: blackUser.id,
          status: GameStatus.WAITING,
          roomCode: 'UNIQUE1',
          boardState: [],
          whiteState: {},
          blackState: {},
        },
      })
    ).rejects.toThrow();
  });

  it('should update game status', async () => {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.WAITING,
        boardState: [],
        whiteState: {},
        blackState: {},
      },
    });

    const updated = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    expect(updated.status).toBe(GameStatus.ACTIVE);
    expect(updated.startedAt).toBeDefined();
  });

  it('should set winner when game finishes', async () => {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.ACTIVE,
        boardState: [],
        whiteState: {},
        blackState: {},
        startedAt: new Date(),
      },
    });

    const finished = await prisma.game.update({
      where: { id: game.id },
      data: {
        status: GameStatus.FINISHED,
        winnerId: whiteUser.id,
        endedAt: new Date(),
      },
    });

    expect(finished.status).toBe(GameStatus.FINISHED);
    expect(finished.winnerId).toBe(whiteUser.id);
    expect(finished.endedAt).toBeDefined();
  });

  it('should create rated game', async () => {
    const game = await prisma.game.create({
      data: {
        whiteId: whiteUser.id,
        blackId: blackUser.id,
        status: GameStatus.WAITING,
        isRated: true,
        boardState: [],
        whiteState: {},
        blackState: {},
      },
    });

    expect(game.isRated).toBe(true);
  });
});

