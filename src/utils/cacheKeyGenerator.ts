import { createHash } from 'node:crypto';

/**
 * Cache Key Generator
 *
 * Utilities for generating consistent cache keys.
 */

/**
 * Generate a cache key from parts
 *
 * @example
 * generateCacheKey('user', '123') // => 'user:123'
 * generateCacheKey('user', 'list', { page: 1, limit: 20 }) // => 'user:list:page=1&limit=20'
 */
export function generateCacheKey(...parts: (string | number | object)[]): string {
  return parts
    .map((part) => {
      if (typeof part === 'object') {
        // Sort object keys for consistency
        const sorted = Object.keys(part)
          .sort()
          .map((key) => {
            const value = part[key as keyof typeof part];
            return `${key}=${String(value)}`;
          })
          .join('&');
        return sorted;
      }
      return String(part);
    })
    .join(':');
}

/**
 * Generate a hash of request body for cache key
 *
 * Useful for POST/PUT requests where the body affects the response.
 *
 * @param body - Request body to hash
 * @returns SHA-256 hash of the body
 */
export function hashBody(body: unknown): string {
  const serialized = JSON.stringify(body);
  return createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

/**
 * Generate a cache key for a user-specific resource
 *
 * @example
 * userCacheKey('123', 'profile') // => 'user:123:profile'
 */
export function userCacheKey(userId: string, resource: string): string {
  return generateCacheKey('user', userId, resource);
}

/**
 * Generate a cache key for a list resource with pagination
 *
 * @example
 * listCacheKey('users', { page: 1, limit: 20 }) // => 'list:users:limit=20&page=1'
 */
export function listCacheKey(resource: string, params: Record<string, unknown>): string {
  return generateCacheKey('list', resource, params);
}
