import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service.js';

const TEST_PREFIX = 'test-cache-svc:';

let redis: Redis;
let cache: CacheService;

beforeAll(async () => {
  redis = new Redis({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    db: Number(process.env.REDIS_DB ?? 0),
    lazyConnect: true,
  });
  await redis.connect();
  cache = new CacheService(redis, 300, TEST_PREFIX);
});

afterAll(async () => {
  await cache.clear();
  await redis.quit();
});

beforeEach(async () => {
  await cache.clear();
});

describe('get', () => {
  it('returns null on a cache miss', async () => {
    expect(await cache.get('nonexistent')).toBeNull();
  });

  it('returns the stored value after set', async () => {
    await cache.set('hello', 'world');
    expect(await cache.get('hello')).toBe('world');
  });

  it('round-trips objects', async () => {
    const obj = { id: 1, name: 'Alice', active: true };
    await cache.set('obj', obj);
    expect(await cache.get('obj')).toEqual(obj);
  });

  it('round-trips arrays', async () => {
    const arr = [1, 'two', { three: 3 }];
    await cache.set('arr', arr);
    expect(await cache.get('arr')).toEqual(arr);
  });
});

describe('set', () => {
  it('stores the value with the specified TTL', async () => {
    await cache.set('ttl-key', 'value', 60);
    const remaining = await redis.ttl(TEST_PREFIX + 'ttl-key');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60);
  });
});

describe('del', () => {
  it('removes an existing key', async () => {
    await cache.set('to-delete', 'bye');
    await cache.del('to-delete');
    expect(await cache.get('to-delete')).toBeNull();
  });
});

describe('delMany', () => {
  it('removes multiple keys', async () => {
    await cache.set('k1', 'v1');
    await cache.set('k2', 'v2');
    await cache.delMany(['k1', 'k2']);
    expect(await cache.get('k1')).toBeNull();
    expect(await cache.get('k2')).toBeNull();
  });

  it('is a no-op for an empty array', async () => {
    await cache.set('safe', 'yes');
    await cache.delMany([]);
    expect(await cache.get('safe')).toBe('yes');
  });
});

describe('getOrSet', () => {
  it('calls the fetcher and caches the result on a cache miss', async () => {
    const fetcher = vi.fn(() => Promise.resolve('fresh-value'));
    const result = await cache.getOrSet('new-key', fetcher);
    expect(result).toBe('fresh-value');
    expect(fetcher).toHaveBeenCalledOnce();
    // Second call must hit cache
    const cached = await cache.get('new-key');
    expect(cached).toBe('fresh-value');
  });

  it('returns the cached value without calling the fetcher on a cache hit', async () => {
    await cache.set('cached-key', 'cached-value');
    const fetcher = vi.fn(() => Promise.resolve('should-not-be-called'));
    const result = await cache.getOrSet('cached-key', fetcher);
    expect(result).toBe('cached-value');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('exists', () => {
  it('returns true when the key is present', async () => {
    await cache.set('present', 42);
    expect(await cache.exists('present')).toBe(true);
  });

  it('returns false when the key is absent', async () => {
    expect(await cache.exists('absent')).toBe(false);
  });
});

describe('ttl', () => {
  it('returns a positive number for a key with a TTL', async () => {
    await cache.set('expiring', 'soon', 120);
    const t = await cache.ttl('expiring');
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(120);
  });

  it('returns -2 for a missing key', async () => {
    expect(await cache.ttl('missing')).toBe(-2);
  });
});

describe('invalidatePattern', () => {
  it('deletes all keys matching the pattern', async () => {
    await cache.set('user:1', 'a');
    await cache.set('user:2', 'b');
    await cache.set('post:1', 'c');
    await cache.invalidatePattern('user:*');
    expect(await cache.get('user:1')).toBeNull();
    expect(await cache.get('user:2')).toBeNull();
    // Non-matching key should survive
    expect(await cache.get('post:1')).toBe('c');
  });
});

describe('clear', () => {
  it('removes all keys with the configured prefix', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });
});

describe('graceful degradation on Redis errors', () => {
  it('get returns null when Redis throws', async () => {
    vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('Redis down'));
    expect(await cache.get('any')).toBeNull();
    vi.restoreAllMocks();
  });

  it('set does not throw when Redis throws', async () => {
    vi.spyOn(redis, 'setex').mockRejectedValueOnce(new Error('Redis down'));
    await expect(cache.set('any', 'value')).resolves.not.toThrow();
    vi.restoreAllMocks();
  });

  it('del does not throw when Redis throws', async () => {
    vi.spyOn(redis, 'del').mockRejectedValueOnce(new Error('Redis down'));
    await expect(cache.del('any')).resolves.not.toThrow();
    vi.restoreAllMocks();
  });

  it('delMany does not throw when Redis throws', async () => {
    vi.spyOn(redis, 'del').mockRejectedValueOnce(new Error('Redis down'));
    await expect(cache.delMany(['k1', 'k2'])).resolves.not.toThrow();
    vi.restoreAllMocks();
  });

  it('exists returns false when Redis throws', async () => {
    vi.spyOn(redis, 'exists').mockRejectedValueOnce(new Error('Redis down'));
    expect(await cache.exists('any')).toBe(false);
    vi.restoreAllMocks();
  });

  it('ttl returns -1 when Redis throws', async () => {
    vi.spyOn(redis, 'ttl').mockRejectedValueOnce(new Error('Redis down'));
    expect(await cache.ttl('any')).toBe(-1);
    vi.restoreAllMocks();
  });

  it('invalidatePattern does not throw when Redis throws', async () => {
    vi.spyOn(redis, 'scan').mockRejectedValueOnce(new Error('Redis down'));
    await expect(cache.invalidatePattern('*')).resolves.not.toThrow();
    vi.restoreAllMocks();
  });
});
