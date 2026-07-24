import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AccessTokenPayload } from '../auth/auth.types.js';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto.js';
import { PaginatedSavedFiltersDto, SavedFilterDto } from './dto/saved-filter.dto.js';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto.js';
import { SavedFiltersService } from './saved-filters.service.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';

@Controller('saved-filters')
export class SavedFiltersController {
  private readonly savedFiltersService: SavedFiltersService;

  constructor(@Inject(SavedFiltersService) savedFiltersService: SavedFiltersService) {
    this.savedFiltersService = savedFiltersService;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSavedFilter(
    @Body() body: CreateSavedFilterDto,
    @CurrentUser('sub') userId: string
  ): Promise<SavedFilterDto> {
    return this.savedFiltersService.createSavedFilter(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listSavedFilters(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: AccessTokenPayload['role']
  ): Promise<SavedFilterDto[]> {
    return this.savedFiltersService.listSavedFilters(userId, role);
  }

  @Get('public')
  @UseGuards(RateLimitGuard)
  @RateLimit(60, 60_000)
  async listPublicSavedFilters(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<PaginatedSavedFiltersDto> {
    return this.savedFiltersService.listPublicSavedFilters(page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSavedFilterById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: AccessTokenPayload['role']
  ): Promise<SavedFilterDto> {
    return this.savedFiltersService.getSavedFilterById(id, userId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateSavedFilter(
    @Param('id') id: string,
    @Body() body: UpdateSavedFilterDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: AccessTokenPayload['role']
  ): Promise<SavedFilterDto> {
    return this.savedFiltersService.updateSavedFilter(id, userId, role, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSavedFilter(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: AccessTokenPayload['role']
  ): Promise<{ id: string; deleted: true }> {
    return this.savedFiltersService.deleteSavedFilter(id, userId, role);
  }
}
