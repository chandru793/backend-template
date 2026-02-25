import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.js';
import { cleanDatabase } from '../helpers/db.js';
import { createUser, buildUserPayload } from '../factories/user.factory.js';

const prisma = new PrismaClient();

describe('User Routes', () => {
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

  // ─── Create ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/users', () => {
    it('creates a user and returns 201 with epoch timestamps', async () => {
      const payload = buildUserPayload();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveProperty('id');
      expect(body.email).toBe(payload.email);
      expect(body.name).toBe(payload.name);
      expect(body.role).toBe('USER');
      expect(body).not.toHaveProperty('password');
      expect(typeof body.createdAt).toBe('number');
      expect(typeof body.updatedAt).toBe('number');
    });

    it('returns 400 for missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: { email: 'missing@example.com' }, // Missing name, password
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: buildUserPayload({ email: 'not-valid' }),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Get By ID ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/users/:id', () => {
    it('returns user with epoch timestamps on cache miss', async () => {
      const user = await createUser(prisma);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${user.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.id).toBe(user.id);
      expect(body.email).toBe(user.email);
      expect(typeof body.createdAt).toBe('number');
      expect(typeof body.updatedAt).toBe('number');
    });

    it('returns same result on cache hit (second request)', async () => {
      const user = await createUser(prisma);

      const first = await app.inject({ method: 'GET', url: `/api/v1/users/${user.id}` });
      const second = await app.inject({ method: 'GET', url: `/api/v1/users/${user.id}` });

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(first.json()).toEqual(second.json());
    });

    it('returns 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/not-a-uuid',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── List ────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/users', () => {
    it('returns paginated list of users', async () => {
      await Promise.all([createUser(prisma), createUser(prisma), createUser(prisma)]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=10',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(3);
      expect(body.pagination).toMatchObject({ page: 1, limit: 10, total: 3 });
    });

    it('returns 400 for invalid pagination (page 0)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users?page=0&limit=10',
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for limit exceeding max', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users?page=1&limit=200',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── Update ──────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/users/:id', () => {
    it('updates user and returns updated data', async () => {
      const user = await createUser(prisma);

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/users/${user.id}`,
        payload: { name: 'Updated Name' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe('Updated Name');
      expect(body.id).toBe(user.id);
      expect(typeof body.updatedAt).toBe('number');
    });

    it('returns 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
        payload: { name: 'Ghost' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── Delete ──────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/users/:id', () => {
    it('deletes user and returns 204', async () => {
      const user = await createUser(prisma);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${user.id}`,
      });

      expect(response.statusCode).toBe(204);
    });

    it('returns 404 after user is deleted', async () => {
      const user = await createUser(prisma);

      await app.inject({ method: 'DELETE', url: `/api/v1/users/${user.id}` });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${user.id}`,
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/00000000-0000-0000-0000-000000000000',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
