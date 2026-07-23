import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { parsePagination } from '../../common/utils/pagination.js';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto.js';
import { PaginatedSavedFiltersDto, SavedFilterDto } from './dto/saved-filter.dto.js';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto.js';

@Injectable()
export class SavedFiltersService {
  private readonly prisma: PrismaService;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.prisma = prisma;
  }

  private isAdmin(role: UserRole | 'USER' | 'CREATOR' | 'ADMIN'): boolean {
    return role === UserRole.ADMIN;
  }

  private assertCanManage(
    savedFilterUserId: string,
    requesterUserId: string,
    requesterRole: UserRole | 'USER' | 'CREATOR' | 'ADMIN'
  ): void {
    if (savedFilterUserId === requesterUserId || this.isAdmin(requesterRole)) {
      return;
    }

    throw new ForbiddenException('You do not have access to this saved filter');
  }

  private toDto(savedFilter: {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    filters: unknown;
    isPublic: boolean;
    views: number;
    createdAt: Date;
    updatedAt: Date;
  }): SavedFilterDto {
    return {
      id: savedFilter.id,
      userId: savedFilter.userId,
      name: savedFilter.name,
      description: savedFilter.description ?? undefined,
      filters: savedFilter.filters as Record<string, unknown>,
      isPublic: savedFilter.isPublic,
      views: savedFilter.views,
      createdAt: savedFilter.createdAt,
      updatedAt: savedFilter.updatedAt,
    };
  }

  async createSavedFilter(userId: string, dto: CreateSavedFilterDto): Promise<SavedFilterDto> {
    const savedFilter = await this.prisma.savedFilter.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        filters: dto.filters as Prisma.InputJsonValue,
        isPublic: dto.isPublic ?? false,
      },
    });

    return this.toDto(savedFilter);
  }

  async listSavedFilters(
    requesterUserId: string,
    requesterRole: UserRole | 'USER' | 'CREATOR' | 'ADMIN'
  ): Promise<SavedFilterDto[]> {
    const savedFilters = await this.prisma.savedFilter.findMany({
      where: this.isAdmin(requesterRole) ? undefined : { userId: requesterUserId },
      orderBy: { createdAt: 'desc' },
    });

    return savedFilters.map((savedFilter) => this.toDto(savedFilter));
  }

  async listPublicSavedFilters(
    pageRaw?: string,
    limitRaw?: string
  ): Promise<PaginatedSavedFiltersDto> {
    const pagination = parsePagination(pageRaw, limitRaw);

    const [items, total] = await Promise.all([
      this.prisma.savedFilter.findMany({
        where: { isPublic: true },
        orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.savedFilter.count({ where: { isPublic: true } }),
    ]);

    return {
      items: items.map((savedFilter) => this.toDto(savedFilter)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async getSavedFilterById(
    id: string,
    requesterUserId: string,
    requesterRole: UserRole | 'USER' | 'CREATOR' | 'ADMIN'
  ): Promise<SavedFilterDto> {
    const savedFilter = await this.prisma.savedFilter.findUnique({ where: { id } });
    if (!savedFilter) {
      throw new NotFoundException('Saved filter not found');
    }

    if (!savedFilter.isPublic) {
      this.assertCanManage(savedFilter.userId, requesterUserId, requesterRole);
    }

    return this.toDto(savedFilter);
  }

  async updateSavedFilter(
    id: string,
    requesterUserId: string,
    requesterRole: UserRole | 'USER' | 'CREATOR' | 'ADMIN',
    dto: UpdateSavedFilterDto
  ): Promise<SavedFilterDto> {
    const existing = await this.prisma.savedFilter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Saved filter not found');
    }

    this.assertCanManage(existing.userId, requesterUserId, requesterRole);

    const updated = await this.prisma.savedFilter.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        filters: dto.filters as Prisma.InputJsonValue | undefined,
        isPublic: dto.isPublic,
      },
    });

    return this.toDto(updated);
  }

  async deleteSavedFilter(
    id: string,
    requesterUserId: string,
    requesterRole: UserRole | 'USER' | 'CREATOR' | 'ADMIN'
  ): Promise<{ id: string; deleted: true }> {
    const existing = await this.prisma.savedFilter.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Saved filter not found');
    }

    this.assertCanManage(existing.userId, requesterUserId, requesterRole);

    await this.prisma.savedFilter.delete({ where: { id } });
    return { id, deleted: true };
  }
}
