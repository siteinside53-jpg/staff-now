const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const ALGORITHM = 'PBKDF2';
const HASH_ALGORITHM = 'SHA-512';

async function deriveKey(password: string, salt: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    ALGORITHM,
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: encoder.encode(salt), iterations: ITERATIONS, hash: HASH_ALGORITHM },
    keyMaterial,
    KEY_LENGTH * 8,
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const uniqueSalt = `${salt}:${crypto.randomUUID()}`;
  const derived = await deriveKey(password, uniqueSalt);
  const hash = bufferToHex(derived);
  return `${uniqueSalt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  _salt: string,
): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length < 3) return false;
  const uniqueSalt = parts.slice(0, -1).join(':');
  const expectedHash = parts[parts.length - 1]!;
  const derived = await deriveKey(password, uniqueSalt);
  const computedHash = bufferToHex(derived);
  if (computedHash.length !== expectedHash.length) return false;
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return result === 0;
}
