import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../../generated/prisma/index.js';
import { AppModule } from '../../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';

type MockUser = {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  refreshTokenHash: string | null;
};

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  const users = new Map<string, MockUser>();
  let nextId = 1;

  const prismaMock = {
    user: {
      findUnique: async (input: { where: { id?: string; email?: string } }) => {
        const { id, email } = input.where;

        if (id) {
          return users.get(id) ?? null;
        }

        if (email) {
          for (const user of users.values()) {
            if (user.email === email) {
              return user;
            }
          }
        }

        return null;
      },
      create: async (input: {
        data: { email: string; passwordHash: string; role?: UserRole };
        select: {
          id?: true;
          email?: true;
          role?: true;
          passwordHash?: true;
          refreshTokenHash?: true;
        };
      }) => {
        const user: MockUser = {
          id: `mock-user-${nextId++}`,
          email: input.data.email,
          role: input.data.role ?? UserRole.USER,
          passwordHash: input.data.passwordHash,
          refreshTokenHash: null,
        };

        users.set(user.id, user);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash,
          refreshTokenHash: user.refreshTokenHash,
        };
      },
      update: async (input: {
        where: { id: string };
        data: { refreshTokenHash: string | null };
      }) => {
        const user = users.get(input.where.id);
        if (!user) {
          throw new Error('User not found in mock store');
        }

        user.refreshTokenHash = input.data.refreshTokenHash;
        users.set(user.id, user);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          passwordHash: user.passwordHash,
          refreshTokenHash: user.refreshTokenHash,
        };
      },
    },
  };

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app.close();
  });

  it('register + login + me + refresh + logout flow works', async () => {
    const email = uniqueEmail('auth-flow');
    const password = 'super-secret-123';

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
      },
    });

    assert.equal(registerRes.statusCode, 201, registerRes.body);
    const registerBody = registerRes.json();
    assert.equal(typeof registerBody.accessToken, 'string');
    assert.equal(typeof registerBody.refreshToken, 'string');
    assert.equal(registerBody.user.email, email);
    assert.equal(registerBody.user.role, 'USER');

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email,
        password,
      },
    });

    assert.equal(loginRes.statusCode, 201, loginRes.body);
    const loginBody = loginRes.json();
    assert.equal(typeof loginBody.accessToken, 'string');
    assert.equal(typeof loginBody.refreshToken, 'string');

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    assert.equal(meRes.statusCode, 200, meRes.body);
    const meBody = meRes.json();

    assert.equal(meBody.email, email);
    assert.equal(meBody.role, 'USER');
    assert.equal(typeof meBody.id, 'string');

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        refreshToken: loginBody.refreshToken,
      },
    });

    assert.equal(refreshRes.statusCode, 201, refreshRes.body);
    const refreshBody = refreshRes.json();
    assert.equal(typeof refreshBody.accessToken, 'string');
    assert.equal(typeof refreshBody.refreshToken, 'string');

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        authorization: `Bearer ${refreshBody.accessToken}`,
      },
    });

    assert.equal(logoutRes.statusCode, 201, logoutRes.body);
    const logoutBody = logoutRes.json();
    assert.equal(logoutBody.revoked, true);

    const refreshAfterLogoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        refreshToken: refreshBody.refreshToken,
      },
    });

    assert.equal(refreshAfterLogoutRes.statusCode, 401, refreshAfterLogoutRes.body);
  });

  it('register returns 409 for duplicate email', async () => {
    const email = uniqueEmail('duplicate');
    const password = 'super-secret-123';

    const firstRegister = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
      },
    });

    assert.equal(firstRegister.statusCode, 201, firstRegister.body);

    const duplicateRegister = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
      },
    });

    assert.equal(duplicateRegister.statusCode, 409, duplicateRegister.body);
  });

  it('login returns 401 for invalid credentials', async () => {
    const email = uniqueEmail('bad-login');
    const password = 'super-secret-123';

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
      },
    });

    assert.equal(registerRes.statusCode, 201, registerRes.body);

    const badLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email,
        password: 'wrong-password-123',
      },
    });

    assert.equal(badLoginRes.statusCode, 401, badLoginRes.body);
  });

  it('refresh returns 401 for invalid token', async () => {
    const badRefreshRes = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: {
        refreshToken: 'not-a-valid-token',
      },
    });

    assert.equal(badRefreshRes.statusCode, 401, badRefreshRes.body);
  });

  it('GET /api/auth/me returns 401 when access token is invalid', async () => {
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    assert.equal(meRes.statusCode, 401, meRes.body);
  });

  it('GET /api/auth/me returns 401 when access token is missing', async () => {
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    assert.equal(meRes.statusCode, 401, meRes.body);
  });
});
