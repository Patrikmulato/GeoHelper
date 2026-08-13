import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/index.js';
import { LoggerService } from '../../common/logger/logger.service.js';
import { sortByLabel } from '../../common/utils/sort-by-label.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsefulMapsService } from '../useful-maps/useful-maps.service.js';
import { CreateUsefulMapCategoryDto } from './dto/create-useful-map-category.dto.js';
import { UpdateUsefulMapCategoryDto } from './dto/update-useful-map-category.dto.js';
import {
  UsefulMapCategoryAdminDto,
  UsefulMapCategoryMutationResponseDto,
} from './dto/useful-map-category-admin.dto.js';

@Injectable()
export class UsefulMapCategoriesService {
  private readonly prisma: PrismaService;
  private readonly usefulMapsService: UsefulMapsService;
  private readonly logger: LoggerService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(UsefulMapsService) usefulMapsService: UsefulMapsService,
    @Inject(LoggerService) logger: LoggerService
  ) {
    this.prisma = prisma;
    this.usefulMapsService = usefulMapsService;
    this.logger = logger;
  }

  async listCategories(): Promise<UsefulMapCategoryAdminDto[]> {
    const categories = await this.prisma.usefulMapCategory.findMany({
      include: {
        _count: {
          select: { usefulMaps: true },
        },
      },
    });

    return sortByLabel(
      categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        label: category.label,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        mapCount: category._count.usefulMaps,
      }))
    );
  }

  async createCategory(
    requesterUserId: string,
    dto: CreateUsefulMapCategoryDto
  ): Promise<UsefulMapCategoryAdminDto> {
    const trimmedLabel = dto.label.trim();
    const trimmedSlug = dto.slug.trim();

    // Case-insensitive pre-check
    const existing = await this.prisma.usefulMapCategory.findFirst({
      where: {
        OR: [
          { slug: { equals: trimmedSlug, mode: 'insensitive' } },
          { label: { equals: trimmedLabel, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('A category with this slug or label already exists');
    }

    try {
      const category = await this.prisma.usefulMapCategory.create({
        data: {
          slug: trimmedSlug,
          label: trimmedLabel,
        },
      });

      this.logger.log('UsefulMapCategoriesService', 'Creating useful map category', {
        requesterUserId,
        categoryId: category.id,
        action: 'create',
      });

      return {
        id: category.id,
        slug: category.slug,
        label: category.label,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        mapCount: 0,
      };
    } catch (err: unknown) {
      // Type guard for Prisma errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (
        (err as any) instanceof Prisma.PrismaClientKnownRequestError &&
        (err as any).code === 'P2002'
      ) {
        throw new ConflictException('A category with this slug or label already exists');
      }
      throw err;
    }
  }

  async updateCategory(
    id: string,
    requesterUserId: string,
    dto: UpdateUsefulMapCategoryDto
  ): Promise<UsefulMapCategoryAdminDto> {
    const trimmedLabel = dto.label.trim();

    const existing = await this.prisma.usefulMapCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usefulMaps: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Useful map category not found');
    }

    // If label is unchanged, return early without touching cache
    if (existing.label === trimmedLabel) {
      return {
        id: existing.id,
        slug: existing.slug,
        label: existing.label,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        mapCount: existing._count.usefulMaps,
      };
    }

    // Case-insensitive label conflict-check excluding this id
    const conflict = await this.prisma.usefulMapCategory.findFirst({
      where: {
        id: { not: id },
        label: { equals: trimmedLabel, mode: 'insensitive' },
      },
    });

    if (conflict) {
      throw new ConflictException('A category with this label already exists');
    }

    const updated = await this.prisma.usefulMapCategory.update({
      where: { id },
      data: { label: trimmedLabel },
    });

    await this.usefulMapsService.invalidatePublicCache();

    this.logger.log('UsefulMapCategoriesService', 'Updating useful map category', {
      requesterUserId,
      categoryId: id,
      action: 'update',
    });

    return {
      id: updated.id,
      slug: updated.slug,
      label: updated.label,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      mapCount: existing._count.usefulMaps,
    };
  }

  async deleteCategory(
    id: string,
    requesterUserId: string
  ): Promise<UsefulMapCategoryMutationResponseDto> {
    const category = await this.prisma.usefulMapCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usefulMaps: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Useful map category not found');
    }

    if (category._count.usefulMaps > 0) {
      throw new ConflictException(
        `Cannot delete category with ${category._count.usefulMaps} attached useful map(s)`
      );
    }

    await this.prisma.usefulMapCategory.delete({
      where: { id },
    });

    await this.usefulMapsService.invalidatePublicCache();

    this.logger.log('UsefulMapCategoriesService', 'Deleting useful map category', {
      requesterUserId,
      categoryId: id,
      action: 'delete',
    });

    return {
      id,
      deleted: true,
    };
  }
}
