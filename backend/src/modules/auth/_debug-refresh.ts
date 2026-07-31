import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../app.module.js';
import { setupApp } from '../../app-setup.js';
import { PrismaService } from '../prisma/prisma.service.js';

const users = new Map<string, Record<string, unknown>>();
let n = 1;

const prismaMock = {
  user: {
    findUnique: async (i: { where: { id?: string; email?: string } }) => {
      const { id, email } = i.where;
      if (id) return users.get(id) ?? null;
      if (email) {
        for (const u of users.values()) if (u.email === email) return u;
      }
      return null;
    },
    create: async (i: { data: Record<string, unknown> }) => {
      const u = {
        id: 'u' + n++,
        email: i.data.email,
        role: i.data.role ?? 'USER',
        passwordHash: i.data.passwordHash,
        refreshTokenHash: null,
      };
      users.set(u.id as string, u);
      return u;
    },
    update: async (i: { where: { id: string }; data: Record<string, unknown> }) => {
      const u = users.get(i.where.id);
      if (!u) throw new Error('nf');
      Object.assign(u, i.data);
      users.set(u.id as string, u);
      return u;
    },
  },
};

async function main() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  setupApp(app, { withGlobalPrefix: true });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'x@y.com', password: 'super-secret-1' },
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'x@y.com', password: 'super-secret-1' },
  });
  const setCookie = login.headers['set-cookie'];
  console.log('SETCOOKIE', JSON.stringify(setCookie));
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  const entry = list.find((e) => e && e.startsWith('refresh_token='));
  const cookie = entry!.split(';')[0];
  const refresh = await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { origin: 'http://localhost:3000', cookie },
  });
  console.log('REFRESH STATUS', refresh.statusCode);
  console.log('REFRESH BODY', refresh.body);
  await app.close();
}

void main();
