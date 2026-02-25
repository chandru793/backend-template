import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../../src/services/password.service.js';

describe('hashPassword', () => {
  it('returns an argon2id hash string', async () => {
    const hash = await hashPassword('secret');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('produces a different hash on each call (random salt)', async () => {
    const h1 = await hashPassword('secret');
    const h2 = await hashPassword('secret');
    expect(h1).not.toBe(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true when the password matches the hash', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await verifyPassword(hash, 'correct-horse')).toBe(true);
  });

  it('returns false when the password does not match', async () => {
    const hash = await hashPassword('correct-horse');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('returns false for a corrupt/invalid hash without throwing', async () => {
    expect(await verifyPassword('not-a-valid-hash', 'password')).toBe(false);
  });
});
