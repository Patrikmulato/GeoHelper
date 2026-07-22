import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateSavedFilterDto } from './dto/create-saved-filter.dto.js';
import { PaginatedSavedFiltersDto, SavedFilterDto } from './dto/saved-filter.dto.js';
import { UpdateSavedFilterDto } from './dto/update-saved-filter.dto.js';
import { SavedFiltersService } from './saved-filters.service.js';

@Controller('saved-filters')
export class SavedFiltersController {
  constructor(private readonly savedFiltersService: SavedFiltersService) {}

  @Post()
  async createSavedFilter(@Body() body: CreateSavedFilterDto): Promise<SavedFilterDto> {
    return this.savedFiltersService.createSavedFilter(body);
  }

  @Get()
  async listSavedFilters(): Promise<SavedFilterDto[]> {
    return this.savedFiltersService.listSavedFilters();
  }

  @Get('public')
  async listPublicSavedFilters(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<PaginatedSavedFiltersDto> {
    return this.savedFiltersService.listPublicSavedFilters(page, limit);
  }

  @Get(':id')
  async getSavedFilterById(@Param('id') id: string): Promise<SavedFilterDto> {
    return this.savedFiltersService.getSavedFilterById(id);
  }

  @Put(':id')
  async updateSavedFilter(
    @Param('id') id: string,
    @Body() body: UpdateSavedFilterDto
  ): Promise<SavedFilterDto> {
    return this.savedFiltersService.updateSavedFilter(id, body);
  }

  @Delete(':id')
  async deleteSavedFilter(@Param('id') id: string): Promise<{ id: string; deleted: true }> {
    return this.savedFiltersService.deleteSavedFilter(id);
  }
}
