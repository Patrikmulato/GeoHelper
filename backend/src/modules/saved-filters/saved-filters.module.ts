import { Module } from '@nestjs/common';
import { SavedFiltersController } from './saved-filters.controller.js';
import { SavedFiltersService } from './saved-filters.service.js';

@Module({
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
