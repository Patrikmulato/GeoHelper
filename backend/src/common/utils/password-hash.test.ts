import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, verifyPassword } from './password-hash.js';

describe('password-hash', () => {
  it('hashes and verifies a valid password', async () => {
    const encoded = await hashPassword('Passw0rd!123');

    assert.ok(encoded.startsWith('scrypt$'));
    assert.equal(await verifyPassword('Passw0rd!123', encoded), true);
  });

  it('returns false for wrong password', async () => {
    const encoded = await hashPassword('Passw0rd!123');

    assert.equal(await verifyPassword('wrong-password', encoded), false);
  });

  it('returns false for malformed hash payloads', async () => {
    assert.equal(await verifyPassword('abc', 'sha256$abc$def'), false);
    assert.equal(await verifyPassword('abc', 'scrypt$$'), false);
    assert.equal(await verifyPassword('abc', 'scrypt$only-salt'), false);
  });
});
