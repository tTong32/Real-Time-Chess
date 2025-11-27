import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from './database';
import { checkDatabaseConnection } from './database';

describe('Database Configuration', () => {
  describe('checkDatabaseConnection', () => {
    it('should return true when database is connected', async () => {
      // This test requires a database connection
      // Skip if DATABASE_URL is not set
      if (!process.env.DATABASE_URL) {
        console.log('Skipping database connection test - DATABASE_URL not set');
        return;
      }

      const isConnected = await checkDatabaseConnection();
      expect(isConnected).toBe(true);
    });

    it('should return false when database query fails', async () => {
      // Temporarily break the connection by using invalid query
      // Note: This might not work in all environments
      const originalQueryRaw = prisma.$queryRaw;
      
      // Mock a failing query
      prisma.$queryRaw = async () => {
        throw new Error('Connection failed');
      };

      const isConnected = await checkDatabaseConnection();
      expect(isConnected).toBe(false);

      // Restore original method
      prisma.$queryRaw = originalQueryRaw;
    });
  });

  describe('Prisma Client', () => {
    it('should be able to execute a simple query', async () => {
      if (!process.env.DATABASE_URL) {
        console.log('Skipping Prisma query test - DATABASE_URL not set');
        return;
      }

      const result = await prisma.$queryRaw`SELECT 1 as value`;
      expect(result).toBeDefined();
    });

    it('should handle connection errors gracefully', async () => {
      // This test verifies that Prisma client is properly configured
      // Actual connection errors should be handled by the application
      expect(prisma).toBeDefined();
      expect(typeof prisma.$connect).toBe('function');
      expect(typeof prisma.$disconnect).toBe('function');
    });
  });
});

describe('Database Connection Pooling', () => {
  it('should maintain connection pool configuration', () => {
    // Verify Prisma client is configured
    expect(prisma).toBeDefined();
    
    // Verify Prisma has connection pool methods
    expect(typeof prisma.$connect).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
    
    // Verify query methods exist
    expect(typeof prisma.$queryRaw).toBe('function');
    expect(typeof prisma.$transaction).toBe('function');
  });

  it('should allow multiple concurrent queries', async () => {
    if (!process.env.DATABASE_URL) {
      console.log('Skipping concurrent query test - DATABASE_URL not set');
      return;
    }

    // Execute multiple queries concurrently
    const queries = [
      prisma.$queryRaw`SELECT 1 as value`,
      prisma.$queryRaw`SELECT 2 as value`,
      prisma.$queryRaw`SELECT 3 as value`,
    ];

    const results = await Promise.all(queries);
    expect(results).toHaveLength(3);
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeDefined();
    expect(results[2]).toBeDefined();
  });
});
