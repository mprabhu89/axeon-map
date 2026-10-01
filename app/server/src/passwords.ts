import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const SALT_BYTES = 16;
const HASH_BYTES = 64;

/** Passwords are one-way scrypt hashes; this module never logs or returns plaintext passwords. */
export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(SALT_BYTES);
  const derived = await derive(password, salt);
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [ , cost, blockSize, parallelization, saltText, hashText ] = parts;
  if (cost !== String(COST) || blockSize !== String(BLOCK_SIZE) || parallelization !== String(PARALLELIZATION)) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length !== SALT_BYTES || expected.length !== HASH_BYTES) return false;
    const actual = await derive(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolveDerived, rejectDerived) => nodeScrypt(password, salt, HASH_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION, maxmem: 64 * 1024 * 1024 }, (error, derived) => error ? rejectDerived(error) : resolveDerived(derived)));
}

function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 256) throw new Error('A local Axeon password must contain 12 to 256 characters.');
}
