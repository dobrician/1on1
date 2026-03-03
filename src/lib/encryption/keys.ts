import { hkdfSync } from 'crypto';

/**
 * Derives a per-tenant encryption key from the master key using HKDF (RFC 5869).
 *
 * The info string includes both tenantId and keyVersion, ensuring that:
 * - Different tenants get different keys (data isolation)
 * - Key rotation produces new keys (forward secrecy)
 *
 * @param tenantId - UUID of the tenant
 * @param keyVersion - Key version number (default: 1, incremented on rotation)
 * @returns 32-byte Buffer suitable for AES-256
 */
export function deriveTenantKey(tenantId: string, keyVersion: number = 1): Buffer {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY environment variable is not set');
  }

  const info = `tenant:${tenantId}:v${keyVersion}`;
  return Buffer.from(
    hkdfSync('sha256', Buffer.from(masterKey, 'hex'), '', info, 32)
  );
}
