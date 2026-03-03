import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { deriveTenantKey } from './keys';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

export interface EncryptedPayload {
  /** Hex-encoded ciphertext */
  ciphertext: string;
  /** Hex-encoded initialization vector (16 bytes) */
  iv: string;
  /** Hex-encoded GCM authentication tag (16 bytes) */
  authTag: string;
  /** Key version used for encryption (enables rotation) */
  keyVersion: number;
}

/**
 * Encrypts a private note using AES-256-GCM with a tenant-specific key.
 *
 * Each encryption uses a random IV, so the same plaintext produces
 * different ciphertext every time (semantic security).
 *
 * @param plaintext - The raw note content
 * @param tenantId - UUID of the tenant (for key derivation)
 * @param keyVersion - Key version to use (default: 1)
 * @returns Encrypted payload ready to be stored as JSON in the database
 */
export function encryptNote(
  plaintext: string,
  tenantId: string,
  keyVersion: number = 1
): EncryptedPayload {
  const key = deriveTenantKey(tenantId, keyVersion);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    keyVersion,
  };
}

/**
 * Decrypts a private note using AES-256-GCM.
 *
 * Uses the keyVersion from the payload to derive the correct key,
 * enabling seamless key rotation: new notes use the latest version,
 * old notes decrypt with their original version.
 *
 * @param payload - The encrypted payload (from database)
 * @param tenantId - UUID of the tenant (for key derivation)
 * @returns The original plaintext
 * @throws Error if authentication fails (wrong key, tampered data)
 */
export function decryptNote(
  payload: EncryptedPayload,
  tenantId: string
): string {
  const key = deriveTenantKey(tenantId, payload.keyVersion);
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

  let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}
