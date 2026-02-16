import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../../../../../tests/helpers/app.js';
import { cleanDatabase } from '../../../../../tests/helpers/db.js';
import { createUser, TEST_PASSWORD } from '../../../../../tests/factories/user.factory.js';

const prisma = new PrismaClient();

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  // ─── Register ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('creates a new user and returns token pair', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: TEST_PASSWORD,
          name: 'New User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
      });
      expect(body.user).not.toHaveProperty('password');
    });

    it('returns 409 for duplicate email', async () => {
      await createUser(prisma, { email: 'dup@example.com' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'dup@example.com',
          password: TEST_PASSWORD,
          name: 'Duplicate',
        },
      });

      expect(response.statusCode).toBe(409);
    });

    it('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: TEST_PASSWORD, name: 'Test' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'test@example.com', password: '123', name: 'Test' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Login ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('returns token pair for valid credentials', async () => {
      await createUser(prisma, { email: 'login@example.com' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@example.com', password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    it('returns 401 for wrong password', async () => {
      await createUser(prisma, { email: 'login@example.com' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@example.com', password: 'WrongPass123!' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'ghost@example.com', password: TEST_PASSWORD },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Me ──────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('returns current user for valid token', async () => {
      // Register to get tokens
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'me@example.com',
          password: TEST_PASSWORD,
          name: 'Me User',
        },
      });
      const { accessToken } = reg.json();

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({ email: 'me@example.com', name: 'Me User' });
      expect(typeof body.createdAt).toBe('number');
      expect(typeof body.updatedAt).toBe('number');
    });

    it('returns 401 without token', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
      expect(response.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { authorization: 'Bearer invalid.token.here' },
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new token pair and invalidates old refresh token', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'refresh@example.com', password: TEST_PASSWORD, name: 'Refresh' },
      });
      const { refreshToken } = reg.json();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      expect(body.refreshToken).not.toBe(refreshToken); // Rotated
    });

    it('returns 401 after token is already used', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'reuse@example.com', password: TEST_PASSWORD, name: 'Reuse' },
      });
      const { refreshToken } = reg.json();

      // Use the refresh token once
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      // Try to reuse - should fail
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('logs out successfully and invalidates refresh token', async () => {
      const reg = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'logout@example.com', password: TEST_PASSWORD, name: 'Logout' },
      });
      const { refreshToken } = reg.json();

      const logout = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken },
      });

      expect(logout.statusCode).toBe(200);
      expect(logout.json()).toMatchObject({ message: 'Logged out successfully' });

      // Refresh after logout should fail
      const refresh = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(refresh.statusCode).toBe(401);
    });

    it('returns 200 even with invalid token (idempotent)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken: 'invalid-token' },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
