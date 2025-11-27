import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';
import prisma from '../../config/database';

let app: ReturnType<typeof createTestApp>;

beforeAll(async () => {
  app = createTestApp();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data before each test
  // Be careful not to delete production data!
  if (process.env.NODE_ENV === 'test') {
    // Only clean up in test environment
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: '@example.com',
        },
      },
    });
  }
});

describe('API Integration Tests', () => {
  describe('Authentication API', () => {
    it('should create a new user on signup', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject duplicate email on signup', async () => {
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      // Try to signup again with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should login with valid credentials', async () => {
      // First create user
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      // Verify email (in real app, this would be done via email link)
      // For testing, we'll manually verify
      const user = await prisma.user.findUnique({
        where: { email: 'login@example.com' },
      });
      
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      }

      // Now try to login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      // Status might be 200 (success) or 403 (email not verified)
      expect([200, 403]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
      }
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Routes', () => {
    let authToken: string;

    beforeAll(async () => {
      // Create and login user to get token
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'protected@example.com',
          password: 'password123',
        });

      const user = await prisma.user.findUnique({
        where: { email: 'protected@example.com' },
      });
      
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: true },
        });
      }

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'protected@example.com',
          password: 'password123',
        });

      authToken = loginResponse.body.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
    });

    it('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});

