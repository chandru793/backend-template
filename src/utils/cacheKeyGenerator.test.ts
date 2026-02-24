import { describe, it, expect } from 'vitest';
import { generateCacheKey, hashBody, userCacheKey, listCacheKey } from './cacheKeyGenerator.js';

describe('generateCacheKey', () => {
  it('joins string parts with colons', () => {
    expect(generateCacheKey('user', '123')).toBe('user:123');
  });

  it('coerces numbers to strings', () => {
    expect(generateCacheKey('user', 123)).toBe('user:123');
  });

  it('serialises objects with sorted keys', () => {
    expect(generateCacheKey('list', { page: 2, limit: 10 })).toBe('list:limit=10&page=2');
  });

  it('produces the same key regardless of object insertion order', () => {
    const a = generateCacheKey('q', { z: 1, a: 2 });
    const b = generateCacheKey('q', { a: 2, z: 1 });
    expect(a).toBe(b);
  });

  it('handles multiple mixed parts', () => {
    expect(generateCacheKey('user', '42', 'profile')).toBe('user:42:profile');
  });
});

describe('hashBody', () => {
  it('returns a 16-character hex string', () => {
    const hash = hashBody({ a: 1 });
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input always yields same hash', () => {
    const first = hashBody({ x: 'hello', y: 42 });
    const second = hashBody({ x: 'hello', y: 42 });
    expect(first).toBe(second);
  });

  it('produces different hashes for different inputs', () => {
    expect(hashBody({ a: 1 })).not.toBe(hashBody({ a: 2 }));
  });
});

describe('userCacheKey', () => {
  it('formats as user:<id>:<resource>', () => {
    expect(userCacheKey('abc', 'profile')).toBe('user:abc:profile');
  });
});

describe('listCacheKey', () => {
  it('formats as list:<resource>:<sorted-params>', () => {
    expect(listCacheKey('users', { page: 1, limit: 20 })).toBe('list:users:limit=20&page=1');
  });
});
