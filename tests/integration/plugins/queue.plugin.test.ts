import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../../helpers/app.js';

/**
 * Queue Plugin Tests
 *
 * Verifies that queue.plugin.ts correctly:
 *   - Decorates the Fastify instance with fastify.queues
 *   - Exposes all four queues (email, welcomeEmail, dataProcessing, deadLetter)
 *   - Allows jobs to be enqueued via the decoration
 *   - Closes all queue connections cleanly via the onClose hook
 */
describe('queue plugin', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('decorates fastify with a queues object', () => {
    expect(app.queues).toBeDefined();
    expect(typeof app.queues).toBe('object');
  });

  it('exposes the email queue', () => {
    expect(app.queues.email).toBeDefined();
    expect(app.queues.email.name).toBe('email');
  });

  it('exposes the welcomeEmail queue', () => {
    expect(app.queues.welcomeEmail).toBeDefined();
    expect(app.queues.welcomeEmail.name).toBe('welcome-email');
  });

  it('exposes the dataProcessing queue', () => {
    expect(app.queues.dataProcessing).toBeDefined();
    expect(app.queues.dataProcessing.name).toBe('data-processing');
  });

  it('exposes the deadLetter queue', () => {
    expect(app.queues.deadLetter).toBeDefined();
    expect(app.queues.deadLetter.name).toBe('dead-letter');
  });

  it('can enqueue a job via fastify.queues.email.add()', async () => {
    const job = await app.queues.email.add('send-email', {
      to: 'plugin-test@example.com',
      subject: 'Plugin Test',
      body: 'Testing queue plugin decoration',
    });

    expect(job.id).toBeDefined();
    expect(job.data.to).toBe('plugin-test@example.com');

    // Clean up the job we added
    await job.remove();
  });

  it('can enqueue a job via fastify.queues.welcomeEmail.add()', async () => {
    const job = await app.queues.welcomeEmail.add('welcome', {
      userId: 'u-plugin-test',
      email: 'welcome-plugin@example.com',
      name: 'Plugin Test User',
    });

    expect(job.id).toBeDefined();
    expect(job.data.userId).toBe('u-plugin-test');

    await job.remove();
  });

  it('can enqueue a job via fastify.queues.dataProcessing.add()', async () => {
    const job = await app.queues.dataProcessing.add('process', {
      userId: 'u-dp-plugin',
      operation: 'analyze',
      params: { format: 'csv' },
    });

    expect(job.id).toBeDefined();
    expect(job.data.operation).toBe('analyze');

    await job.remove();
  });
});

// ─── Bull Board: production guard ─────────────────────────────────────────────

describe('Bull Board plugin - production guard', () => {
  let prodApp: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    prodApp = await createTestApp();
  });

  afterAll(async () => {
    await prodApp.close();
    process.env.NODE_ENV = 'test';
  });

  it('does not mount /queues in production', async () => {
    const response = await prodApp.inject({ method: 'GET', url: '/queues' });
    expect(response.statusCode).toBe(404);
  });
});
