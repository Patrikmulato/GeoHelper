import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { RateLimitStore } from './rate-limit.store.js';

const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
});

describe('RateLimitStore', () => {
  it('applies in-memory window limits when upstash env vars are not set', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const store = new RateLimitStore();

    const first = await store.hit('k1', 2, 60_000);
    const second = await store.hit('k1', 2, 60_000);
    const third = await store.hit('k1', 2, 60_000);

    assert.equal(first.allowed, true);
    assert.equal(first.remaining, 1);

    assert.equal(second.allowed, true);
    assert.equal(second.remaining, 0);

    assert.equal(third.allowed, false);
    assert.equal(third.remaining, 0);
    assert.equal(third.limit, 2);
  });

  it('uses upstash backend when both url and token are set', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

    const calls: Array<string> = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      calls.push(url);

      if (url.includes('/incr/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: 1 }),
        } as Response;
      }

      if (url.includes('/expire/')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ result: 1 }),
        } as Response;
      }

      return {
        ok: false,
        status: 500,
        json: async () => ({ result: 0 }),
      } as Response;
    }) as typeof fetch;

    try {
      const store = new RateLimitStore();
      const result = await store.hit('k2', 3, 30_000);

      assert.equal(result.allowed, true);
      assert.equal(result.remaining, 2);
      assert.equal(calls.length, 2);
      assert.ok(calls[0].includes('/incr/'));
      assert.ok(calls[1].includes('/expire/'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
