import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

/**
 * Initialize the cipher with encryption key from environment
 * Call this once at app startup
 */
export function initIdCipher(key?: string): void {
  const secretKey = key || process.env.ID_ENCRYPTION_KEY || '';
  if (!secretKey) {
    console.warn('ID_ENCRYPTION_KEY not set - ID encryption disabled');
    return;
  }
  // Create 32-byte key from secret using SHA-256
  encryptionKey = crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypt a numeric ID to an obfuscated string
 * Returns original ID as string if encryption not initialized
 */
export function encryptId(id: number): string {
  if (!encryptionKey) {
    return String(id);
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const idBuffer = Buffer.from(String(id), 'utf8');
    const encrypted = Buffer.concat([cipher.update(idBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + encrypted, then base64url encode
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64url');
  } catch {
    return String(id);
  }
}

/**
 * Decrypt an obfuscated string back to numeric ID
 * Returns null if decryption fails
 */
export function decryptId(encryptedId: string): number | null {
  if (!encryptionKey) {
    // If encryption disabled, try parsing as plain number
    const parsed = parseInt(encryptedId, 10);
    return isNaN(parsed) ? null : parsed;
  }

  try {
    const combined = Buffer.from(encryptedId, 'base64url');

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      const parsed = parseInt(encryptedId, 10);
      return isNaN(parsed) ? null : parsed;
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const id = parseInt(decrypted.toString('utf8'), 10);
    return isNaN(id) ? null : id;
  } catch {
    // Fallback: try parsing as plain number
    const parsed = parseInt(encryptedId, 10);
    return isNaN(parsed) ? null : parsed;
  }
}

/**
 * Check if ID cipher is initialized
 */
export function isIdCipherEnabled(): boolean {
  return encryptionKey !== null;
}
