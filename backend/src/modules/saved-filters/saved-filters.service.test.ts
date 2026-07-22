import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { SavedFiltersService } from './saved-filters.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makeDate(value: string): Date {
  return new Date(value);
}

describe('SavedFiltersService', () => {
  it('createSavedFilter defaults isPublic to false', async () => {
    const createdAt = makeDate('2026-01-01T00:00:00.000Z');
    const updatedAt = makeDate('2026-01-02T00:00:00.000Z');

    let capturedIsPublic: boolean | undefined;

    const prismaMock = {
      savedFilter: {
        create: async (input: {
          data: {
            userId: string;
            name: string;
            description?: string;
            filters: Record<string, unknown>;
            isPublic: boolean;
          };
        }) => {
          capturedIsPublic = input.data.isPublic;
          return {
            id: 'sf-1',
            userId: input.data.userId,
            name: input.data.name,
            description: input.data.description ?? null,
            filters: input.data.filters,
            isPublic: input.data.isPublic,
            views: 0,
            createdAt,
            updatedAt,
          };
        },
        findMany: async () => [],
        count: async () => 0,
        findUnique: async () => null,
        update: async () => {
          throw new Error('update should not be called');
        },
        delete: async () => {
          throw new Error('delete should not be called');
        },
      },
    };

    const service = new SavedFiltersService(prismaMock as unknown as PrismaService);

    const result = await service.createSavedFilter({
      userId: 'user-1',
      name: 'Starter',
      filters: { sideFilter: 'left' },
    });

    assert.equal(capturedIsPublic, false);
    assert.equal(result.id, 'sf-1');
    assert.equal(result.isPublic, false);
  });

  it('listPublicSavedFilters returns paginated result with parsed page and limit', async () => {
    const createdAt = makeDate('2026-01-01T00:00:00.000Z');
    const updatedAt = makeDate('2026-01-01T00:00:00.000Z');

    let capturedSkip: number | undefined;
    let capturedTake: number | undefined;

    const prismaMock = {
      savedFilter: {
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async (input: {
          where: { isPublic: true };
          orderBy: Array<Record<string, 'asc' | 'desc'>>;
          skip: number;
          take: number;
        }) => {
          capturedSkip = input.skip;
          capturedTake = input.take;
          return [
            {
              id: 'sf-public',
              userId: 'user-1',
              name: 'Public Filter',
              description: null,
              filters: { cameraGenFilter: '4' },
              isPublic: true,
              views: 20,
              createdAt,
              updatedAt,
            },
          ];
        },
        count: async () => 7,
        findUnique: async () => null,
        update: async () => {
          throw new Error('update should not be called');
        },
        delete: async () => {
          throw new Error('delete should not be called');
        },
      },
    };

    const service = new SavedFiltersService(prismaMock as unknown as PrismaService);

    const result = await service.listPublicSavedFilters('2', '3');

    assert.equal(capturedSkip, 3);
    assert.equal(capturedTake, 3);
    assert.equal(result.page, 2);
    assert.equal(result.limit, 3);
    assert.equal(result.total, 7);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, 'sf-public');
  });

  it('getSavedFilterById throws NotFoundException when missing', async () => {
    const prismaMock = {
      savedFilter: {
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async () => [],
        count: async () => 0,
        findUnique: async () => null,
        update: async () => {
          throw new Error('update should not be called');
        },
        delete: async () => {
          throw new Error('delete should not be called');
        },
      },
    };

    const service = new SavedFiltersService(prismaMock as unknown as PrismaService);

    await assert.rejects(
      service.getSavedFilterById('missing-id'),
      (error: unknown) =>
        error instanceof NotFoundException && error.message === 'Saved filter not found'
    );
  });

  it('deleteSavedFilter returns deletion marker for existing entity', async () => {
    const prismaMock = {
      savedFilter: {
        create: async () => {
          throw new Error('create should not be called');
        },
        findMany: async () => [],
        count: async () => 0,
        findUnique: async () => ({ id: 'sf-1' }),
        update: async () => {
          throw new Error('update should not be called');
        },
        delete: async () => ({ id: 'sf-1' }),
      },
    };

    const service = new SavedFiltersService(prismaMock as unknown as PrismaService);

    const result = await service.deleteSavedFilter('sf-1');

    assert.deepEqual(result, { id: 'sf-1', deleted: true });
  });
});
