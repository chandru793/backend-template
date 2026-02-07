import type { Redis } from 'ioredis';

/**
 * Cache Service
 *
 * Redis-backed caching with cache-aside pattern.
 * - get/set/del operations with TTL support
 * - Pattern-based invalidation (use sparingly)
 * - Cache-aside helper (getOrSet)
 *
 * Key Standards:
 * - Never use KEYS command in production (use SCAN instead)
 * - Never cache null results without very short TTL
 * - Prefer explicit key deletion over pattern invalidation
 */
export class CacheService {
  constructor(
    private readonly redis: Redis,
    private readonly defaultTtl = 300, // 5 minutes default
    private readonly prefix = 'cache:',
  ) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.prefix + key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      // Log error but don't throw - graceful degradation
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const finalTtl = ttl ?? this.defaultTtl;
      await this.redis.setex(this.prefix + key, finalTtl, serialized);
    } catch (error) {
      // Log error but don't throw - graceful degradation
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefix + key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      const prefixedKeys = keys.map((k) => this.prefix + k);
      await this.redis.del(...prefixedKeys);
    } catch (error) {
      console.error('Cache delMany error:', error);
    }
  }

  /**
   * Invalidate all keys matching a pattern
   *
   * WARNING: Use sparingly! SCAN is non-blocking but slow for large keyspaces.
   * Prefer explicit key deletion when possible.
   *
   * @param pattern - Pattern to match (e.g., 'user:*')
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      const keysToDelete: string[] = [];

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          this.prefix + pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keysToDelete.push(...keys);
      } while (cursor !== '0');

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
      }
    } catch (error) {
      console.error('Cache invalidatePattern error:', error);
    }
  }

  /**
   * Cache-aside pattern: Get from cache or execute fetcher
   *
   * If value exists in cache, return it.
   * Otherwise, execute fetcher, cache the result, and return it.
   *
   * @param key - Cache key
   * @param fetcher - Function to fetch data if not cached
   * @param ttl - Optional TTL override
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch fresh data
    const fresh = await fetcher();

    // Cache the result (even if null/undefined, for short TTL)
    await this.set(key, fresh, ttl);

    return fresh;
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.prefix + key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.prefix + key);
    } catch (error) {
      console.error('Cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache keys with the configured prefix
   *
   * WARNING: Use only in testing or maintenance!
   */
  async clear(): Promise<void> {
    await this.invalidatePattern('*');
  }
}
