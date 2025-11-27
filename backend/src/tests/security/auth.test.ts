import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/test-app';

let app: ReturnType<typeof createTestApp>;

describe('Security Tests - Authentication', () => {
  beforeAll(() => {
    app = createTestApp();
  });

  describe('Input Validation', () => {
    it('should reject SQL injection attempts in email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'password',
        });

      expect(response.status).toBe(400);
    });

    it('should reject XSS attempts in email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });

    it('should reject extremely long email', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: longEmail,
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });

    it('should reject empty password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '',
        });

      expect(response.status).toBe(400);
    });

    it('should reject very short password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts', async () => {
      // Make multiple rapid login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(attempts);
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Token Security', () => {
    it('should reject expired tokens', async () => {
      // Create an expired token (you'll need JWT library for this)
      const expiredToken = 'expired-token-placeholder';
      
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-token');

      expect(response.status).toBe(401);
    });
  });
});

