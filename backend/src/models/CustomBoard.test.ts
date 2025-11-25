import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import prisma from '../config/database';

describe('CustomBoard Model', () => {
  let user: { id: string };

  beforeAll(async () => {
    await prisma.customBoard.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.customBoard.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.customBoard.deleteMany({});
    await prisma.user.deleteMany({});

    user = await prisma.user.create({
      data: {
        email: 'user@example.com',
        passwordHash: 'hash',
      },
    });
  });

  it('should create a custom board with required fields', async () => {
    const board = await prisma.customBoard.create({
      data: {
        userId: user.id,
        name: 'My Custom Board',
        boardData: [],
      },
    });

    expect(board).toBeDefined();
    expect(board.userId).toBe(user.id);
    expect(board.name).toBe('My Custom Board');
    expect(board.boardData).toEqual([]);
    expect(board.id).toBeDefined();
    expect(board.createdAt).toBeDefined();
  });

  it('should store board data as JSON', async () => {
    const boardData = [
      { type: 'pawn', color: 'white', row: 6, col: 0 },
      { type: 'rook', color: 'white', row: 7, col: 0 },
    ];

    const board = await prisma.customBoard.create({
      data: {
        userId: user.id,
        name: 'Test Board',
        boardData: boardData as any,
      },
    });

    expect(board.boardData).toEqual(boardData);
  });

  it('should update custom board', async () => {
    const board = await prisma.customBoard.create({
      data: {
        userId: user.id,
        name: 'Original Name',
        boardData: [],
      },
    });

    const updated = await prisma.customBoard.update({
      where: { id: board.id },
      data: {
        name: 'Updated Name',
        boardData: [{ type: 'pawn', color: 'white', row: 6, col: 0 }] as any,
      },
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(board.updatedAt.getTime());
  });

  it('should cascade delete when user is deleted', async () => {
    const board = await prisma.customBoard.create({
      data: {
        userId: user.id,
        name: 'To Delete',
        boardData: [],
      },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    const deleted = await prisma.customBoard.findUnique({
      where: { id: board.id },
    });

    expect(deleted).toBeNull();
  });

  it('should query boards by user', async () => {
    await prisma.customBoard.createMany({
      data: [
        {
          userId: user.id,
          name: 'Board 1',
          boardData: [],
        },
        {
          userId: user.id,
          name: 'Board 2',
          boardData: [],
        },
      ],
    });

    const boards = await prisma.customBoard.findMany({
      where: { userId: user.id },
    });

    expect(boards.length).toBe(2);
  });
});

