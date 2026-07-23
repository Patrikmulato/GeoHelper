import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeDate(value: string): Date {
  return new Date(value);
}

describe('UsersService', () => {
  it('createUser creates a user with default role and hashed password', async () => {
    const createdAt = makeDate('2026-01-01T00:00:00.000Z');
    const updatedAt = makeDate('2026-01-02T00:00:00.000Z');

    let capturedPasswordHash: string | undefined;
    let capturedRole: UserRole | undefined;

    const prismaMock = {
      user: {
        findUnique: async () => null,
        create: async (input: {
          data: { email: string; role: UserRole; passwordHash?: string };
          select: {
            id: true;
            email: true;
            role: true;
            createdAt: true;
            updatedAt: true;
          };
        }) => {
          capturedPasswordHash = input.data.passwordHash;
          capturedRole = input.data.role;
          return {
            id: 'user-1',
            email: input.data.email,
            role: input.data.role,
            createdAt,
            updatedAt,
          };
        },
        findMany: async () => [],
      },
    };

    const service = new UsersService(prismaMock as unknown as PrismaService);

    const result = await service.createUser({
      email: 'junior@example.com',
      password: 'super-secret',
    });

    assert.equal(result.id, 'user-1');
    assert.equal(result.email, 'junior@example.com');
    assert.equal(result.role, UserRole.USER);
    assert.equal(result.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(result.updatedAt.toISOString(), updatedAt.toISOString());

    assert.ok(capturedPasswordHash);
    const hashParts = capturedPasswordHash.split('$');
    assert.equal(hashParts.length, 3);
    assert.equal(hashParts[0], 'scrypt');
    assert.match(hashParts[1], /^[0-9a-f]{32}$/);
    assert.match(hashParts[2], /^[0-9a-f]{128}$/);
    assert.notEqual(capturedPasswordHash, 'super-secret');
    assert.equal(capturedRole, UserRole.USER);
  });

  it('createUser throws ConflictException when email already exists', async () => {
    const prismaMock = {
      user: {
        findUnique: async () => ({ id: 'existing-user' }),
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async () => [],
      },
    };

    const service = new UsersService(prismaMock as unknown as PrismaService);

    await assert.rejects(
      service.createUser({ email: 'existing@example.com' }),
      (error: unknown) =>
        error instanceof ConflictException &&
        error.message === 'A user with this email already exists'
    );
  });

  it('getUserById throws NotFoundException when user does not exist', async () => {
    const prismaMock = {
      user: {
        findUnique: async () => null,
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async () => [],
      },
    };

    const service = new UsersService(prismaMock as unknown as PrismaService);

    await assert.rejects(
      service.getUserById('missing-user'),
      (error: unknown) => error instanceof NotFoundException && error.message === 'User not found'
    );
  });

  it('listUsers returns mapped users in createdAt desc order from prisma', async () => {
    const createdAt = makeDate('2026-01-03T00:00:00.000Z');
    const updatedAt = makeDate('2026-01-04T00:00:00.000Z');

    const prismaMock = {
      user: {
        findUnique: async () => null,
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async () => [
          {
            id: 'u-2',
            email: 'a@example.com',
            role: UserRole.CREATOR,
            createdAt,
            updatedAt,
          },
        ],
      },
    };

    const service = new UsersService(prismaMock as unknown as PrismaService);

    const result = await service.listUsers();

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'u-2');
    assert.equal(result[0].role, UserRole.CREATOR);
  });
});
