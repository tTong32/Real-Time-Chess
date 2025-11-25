import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, GameStatus } from '@prisma/client';
import prisma from '../config/database';

describe('Move Model', () => {
  let whiteUser: { id: string };
  let blackUser: { id: string };
  let game: { id: string };

  beforeAll(async () => {
    await prisma.move.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.move.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.move.deleteMany({});
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

    game = await prisma.game.create({
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
  });

  it('should create a move with required fields', async () => {
    const move = await prisma.move.create({
      data: {
        gameId: game.id,
        playerId: whiteUser.id,
        fromRow: 6,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceType: 'pawn',
        energyCost: 2,
      },
    });

    expect(move).toBeDefined();
    expect(move.gameId).toBe(game.id);
    expect(move.playerId).toBe(whiteUser.id);
    expect(move.fromRow).toBe(6);
    expect(move.fromCol).toBe(4);
    expect(move.toRow).toBe(4);
    expect(move.toCol).toBe(4);
    expect(move.pieceType).toBe('pawn');
    expect(move.energyCost).toBe(2);
    expect(move.timestamp).toBeDefined();
  });

  it('should create a move with captured piece', async () => {
    const move = await prisma.move.create({
      data: {
        gameId: game.id,
        playerId: whiteUser.id,
        fromRow: 6,
        fromCol: 4,
        toRow: 1,
        toCol: 4,
        pieceType: 'pawn',
        energyCost: 2,
        capturedPiece: 'pawn',
      },
    });

    expect(move.capturedPiece).toBe('pawn');
  });

  it('should cascade delete moves when game is deleted', async () => {
    const move = await prisma.move.create({
      data: {
        gameId: game.id,
        playerId: whiteUser.id,
        fromRow: 6,
        fromCol: 4,
        toRow: 4,
        toCol: 4,
        pieceType: 'pawn',
        energyCost: 2,
      },
    });

    await prisma.game.delete({
      where: { id: game.id },
    });

    const deletedMove = await prisma.move.findUnique({
      where: { id: move.id },
    });

    expect(deletedMove).toBeNull();
  });

  it('should query moves by game', async () => {
    await prisma.move.createMany({
      data: [
        {
          gameId: game.id,
          playerId: whiteUser.id,
          fromRow: 6,
          fromCol: 4,
          toRow: 4,
          toCol: 4,
          pieceType: 'pawn',
          energyCost: 2,
        },
        {
          gameId: game.id,
          playerId: blackUser.id,
          fromRow: 1,
          fromCol: 4,
          toRow: 3,
          toCol: 4,
          pieceType: 'pawn',
          energyCost: 2,
        },
      ],
    });

    const moves = await prisma.move.findMany({
      where: { gameId: game.id },
      orderBy: { timestamp: 'asc' },
    });

    expect(moves.length).toBe(2);
  });
});

