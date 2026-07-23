import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SavedFiltersController } from './saved-filters.controller.js';
import { SavedFiltersService } from './saved-filters.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SavedFiltersController],
  providers: [SavedFiltersService],
  exports: [SavedFiltersService],
})
export class SavedFiltersModule {}
