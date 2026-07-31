import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { resolveAccessTokenSecret, resolveRefreshTokenSecret } from './auth.constants.js';

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
});

describe('auth constants', () => {
  it('uses explicit JWT secrets when provided', () => {
    process.env.JWT_SECRET = 'access-explicit';
    process.env.JWT_REFRESH_SECRET = 'refresh-explicit';

    assert.equal(resolveAccessTokenSecret(), 'access-explicit');
    assert.equal(resolveRefreshTokenSecret(), 'refresh-explicit');
  });

  it('uses test defaults in test environment without explicit secrets', () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    process.env.NODE_ENV = 'test';

    assert.equal(resolveAccessTokenSecret(), 'test-jwt-secret');
    assert.equal(resolveRefreshTokenSecret(), 'test-jwt-refresh-secret');
  });

  it('uses development fallbacks outside test when explicit secrets are missing', () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    process.env.NODE_ENV = 'development';

    assert.equal(resolveAccessTokenSecret(), 'dev-jwt-secret-change-me');
    assert.equal(resolveRefreshTokenSecret(), 'dev-jwt-refresh-secret-change-me');
  });
});
