import argon2 from 'argon2';

/**
 * Password hashing service using Argon2id
 * Argon2id is recommended by OWASP for password hashing (hybrid mode)
 */

/**
 * Argon2 configuration (OWASP recommendations)
 * - Algorithm: Argon2id (hybrid - resistant to both side-channel and GPU attacks)
 * - Memory: 64 MB (65536 KiB)
 * - Iterations: 3
 * - Parallelism: 1
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 1,
};

/**
 * Hash a password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against an Argon2 hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // If verification fails (corrupt hash, etc.), return false
    return false;
  }
}
