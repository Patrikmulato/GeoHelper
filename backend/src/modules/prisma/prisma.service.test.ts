import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { PrismaService } from './prisma.service.js';

type ResolverType = {
  resolveDatabaseConnection: () => {
    connectionString: string;
    shouldConnect: boolean;
  };
};

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalNodeEnv = process.env.NODE_ENV;
const originalDotenvPath = process.env.DOTENV_CONFIG_PATH;

afterEach(() => {
  process.env.DATABASE_URL = originalDatabaseUrl;
  process.env.NODE_ENV = originalNodeEnv;
  process.env.DOTENV_CONFIG_PATH = originalDotenvPath;
});

describe('PrismaService', () => {
  it('uses DATABASE_URL directly when present', () => {
    process.env.DATABASE_URL = 'postgresql://db.example.com:5432/app';

    const resolver = PrismaService as unknown as ResolverType;
    const config = resolver.resolveDatabaseConnection();

    assert.equal(config.connectionString, 'postgresql://db.example.com:5432/app');
    assert.equal(config.shouldConnect, true);
  });

  it('uses fallback connection in test mode when DATABASE_URL is absent', () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'test';
    process.env.DOTENV_CONFIG_PATH = '/tmp/non-existent-dotenv-path';

    const resolver = PrismaService as unknown as ResolverType;
    const config = resolver.resolveDatabaseConnection();

    assert.equal(config.shouldConnect, false);
    assert.ok(config.connectionString.includes('localhost:5432/postgres'));
  });

  it('throws when DATABASE_URL is absent outside test mode', () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'development';
    process.env.DOTENV_CONFIG_PATH = '/tmp/non-existent-dotenv-path';

    const resolver = PrismaService as unknown as ResolverType;

    assert.throws(() => resolver.resolveDatabaseConnection(), /DATABASE_URL is required/);
  });

  it('calls connect/disconnect only when shouldConnect is true', async () => {
    let connectCalls = 0;
    let disconnectCalls = 0;

    const connectedService = Object.create(PrismaService.prototype) as PrismaService & {
      shouldConnect: boolean;
      $connect: () => Promise<void>;
      $disconnect: () => Promise<void>;
    };

    Object.defineProperty(connectedService, 'shouldConnect', {
      value: true,
      writable: true,
      configurable: true,
    });

    connectedService.$connect = async () => {
      connectCalls += 1;
    };

    connectedService.$disconnect = async () => {
      disconnectCalls += 1;
    };

    await connectedService.onModuleInit();
    await connectedService.onModuleDestroy();

    assert.equal(connectCalls, 1);
    assert.equal(disconnectCalls, 1);

    const disconnectedService = Object.create(PrismaService.prototype) as PrismaService & {
      shouldConnect: boolean;
      $connect: () => Promise<void>;
      $disconnect: () => Promise<void>;
    };

    Object.defineProperty(disconnectedService, 'shouldConnect', {
      value: false,
      writable: true,
      configurable: true,
    });

    disconnectedService.$connect = async () => {
      connectCalls += 1;
    };

    disconnectedService.$disconnect = async () => {
      disconnectCalls += 1;
    };

    await disconnectedService.onModuleInit();
    await disconnectedService.onModuleDestroy();

    assert.equal(connectCalls, 1);
    assert.equal(disconnectCalls, 1);
  });
});
