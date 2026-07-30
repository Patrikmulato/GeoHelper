import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { getAppConfig } from './app.config.js';

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  CACHE_OUTAGE_POLICY: process.env.CACHE_OUTAGE_POLICY,
  RATE_LIMIT_OUTAGE_POLICY: process.env.RATE_LIMIT_OUTAGE_POLICY,
};

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  process.env.DATABASE_URL = ORIGINAL_ENV.DATABASE_URL;
  process.env.JWT_SECRET = ORIGINAL_ENV.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = ORIGINAL_ENV.JWT_REFRESH_SECRET;
  process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_ENV.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_ENV.UPSTASH_REDIS_REST_TOKEN;
  process.env.CACHE_OUTAGE_POLICY = ORIGINAL_ENV.CACHE_OUTAGE_POLICY;
  process.env.RATE_LIMIT_OUTAGE_POLICY = ORIGINAL_ENV.RATE_LIMIT_OUTAGE_POLICY;
});

describe('AppConfig hardening policy', () => {
  it('requires Upstash env vars in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://example';
    process.env.JWT_SECRET = 'jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'jwt-refresh-secret';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    assert.throws(() => getAppConfig(), /UPSTASH_REDIS_REST_URL is required in production/);
  });

  it('parses outage policies from env', () => {
    process.env.NODE_ENV = 'development';
    process.env.CACHE_OUTAGE_POLICY = 'fail-open';
    process.env.RATE_LIMIT_OUTAGE_POLICY = 'fail-closed';

    const config = getAppConfig();

    assert.equal(config.cacheOutagePolicy, 'fail-open');
    assert.equal(config.rateLimitOutagePolicy, 'fail-closed');
  });
});
