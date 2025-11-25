import { describe, it, expect } from 'vitest';
import prisma from './database';

describe('Database Connection', () => {
  it('should connect to database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
    await prisma.$disconnect();
  });

  it('should execute a simple query', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
    await prisma.$disconnect();
  });
});

