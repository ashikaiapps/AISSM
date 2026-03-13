import { describe, it, expect } from 'vitest';

// Set required env var before importing
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

// Dynamic import so env is set first
const { encrypt, decrypt } = await import('../services/crypto.js');

describe('crypto service', () => {
  it('encrypts and decrypts a string', () => {
    const plaintext = 'my-secret-token-12345';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces iv:tag:ciphertext format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV = 12 bytes = 24 hex chars
    expect(parts[0]).toHaveLength(24);
    // Tag = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('produces different ciphertexts for the same input (unique IVs)', () => {
    const a = encrypt('same-input');
    const b = encrypt('same-input');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same-input');
    expect(decrypt(b)).toBe('same-input');
  });

  it('throws on invalid encrypted format', () => {
    expect(() => decrypt('not-valid')).toThrow('Invalid encrypted format');
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    parts[2] = 'ff'.repeat(parts[2].length / 2);
    expect(() => decrypt(parts.join(':'))).toThrow();
  });

  it('handles empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('handles unicode', () => {
    const text = '🔑 SocialKeys — 日本語テスト';
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it('handles long strings', () => {
    const text = 'x'.repeat(10000);
    expect(decrypt(encrypt(text))).toBe(text);
  });
});
