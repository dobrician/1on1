import { describe, it, expect, beforeAll } from 'vitest';
import { deriveTenantKey } from '../keys';
import { encryptNote, decryptNote, type EncryptedPayload } from '../private-notes';

// Set test encryption master key (64 hex chars = 32 bytes)
beforeAll(() => {
  process.env.ENCRYPTION_MASTER_KEY =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
});

describe('deriveTenantKey', () => {
  it('returns a 32-byte Buffer for a given tenantId and keyVersion', () => {
    const key = deriveTenantKey('tenant-uuid-1', 1);
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it('returns different keys for different tenantIds', () => {
    const key1 = deriveTenantKey('tenant-uuid-1', 1);
    const key2 = deriveTenantKey('tenant-uuid-2', 1);
    expect(key1.equals(key2)).toBe(false);
  });

  it('returns different keys for different keyVersions of the same tenant', () => {
    const key1 = deriveTenantKey('tenant-uuid-1', 1);
    const key2 = deriveTenantKey('tenant-uuid-1', 2);
    expect(key1.equals(key2)).toBe(false);
  });

  it('returns the same key for the same tenantId and keyVersion (deterministic)', () => {
    const key1 = deriveTenantKey('tenant-uuid-1', 1);
    const key2 = deriveTenantKey('tenant-uuid-1', 1);
    expect(key1.equals(key2)).toBe(true);
  });
});

describe('encryptNote / decryptNote', () => {
  const tenantId = 'test-tenant-uuid';

  it('encryptNote returns an EncryptedPayload with ciphertext, iv, authTag, and keyVersion fields', () => {
    const payload = encryptNote('Hello, world!', tenantId);
    expect(payload).toHaveProperty('ciphertext');
    expect(payload).toHaveProperty('iv');
    expect(payload).toHaveProperty('authTag');
    expect(payload).toHaveProperty('keyVersion');
    expect(typeof payload.ciphertext).toBe('string');
    expect(typeof payload.iv).toBe('string');
    expect(typeof payload.authTag).toBe('string');
    expect(typeof payload.keyVersion).toBe('number');
  });

  it('decryptNote(encryptNote(plaintext)) returns the original plaintext', () => {
    const plaintext = 'This is a secret private note about the session.';
    const payload = encryptNote(plaintext, tenantId);
    const decrypted = decryptNote(payload, tenantId);
    expect(decrypted).toBe(plaintext);
  });

  it('encryptNote produces different ciphertext for the same plaintext (due to random IV)', () => {
    const plaintext = 'Same message';
    const payload1 = encryptNote(plaintext, tenantId);
    const payload2 = encryptNote(plaintext, tenantId);
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
    expect(payload1.iv).not.toBe(payload2.iv);
  });

  it('decryptNote with wrong tenantId throws an error (authentication fails)', () => {
    const payload = encryptNote('Secret', tenantId);
    expect(() => decryptNote(payload, 'wrong-tenant-uuid')).toThrow();
  });

  it('decryptNote correctly uses the payload keyVersion (not a hardcoded version)', () => {
    // Encrypt with key version 2
    const plaintext = 'Version 2 note';
    const payload = encryptNote(plaintext, tenantId, 2);
    expect(payload.keyVersion).toBe(2);

    // Decrypt should use keyVersion from the payload (v2), not default (v1)
    const decrypted = decryptNote(payload, tenantId);
    expect(decrypted).toBe(plaintext);

    // Verify that changing the keyVersion in the payload causes failure
    const tamperedPayload: EncryptedPayload = { ...payload, keyVersion: 1 };
    expect(() => decryptNote(tamperedPayload, tenantId)).toThrow();
  });

  it('empty string encrypts and decrypts correctly', () => {
    const payload = encryptNote('', tenantId);
    const decrypted = decryptNote(payload, tenantId);
    expect(decrypted).toBe('');
  });

  it('unicode content (emoji, CJK characters) encrypts and decrypts correctly', () => {
    const unicode = 'Meeting was great! \u{1F60A}\u{1F44D} \u5F00\u4F1A\u5F88\u597D \uC548\uB155\uD558\uC138\uC694';
    const payload = encryptNote(unicode, tenantId);
    const decrypted = decryptNote(payload, tenantId);
    expect(decrypted).toBe(unicode);
  });
});
