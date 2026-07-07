import { Module } from '@nestjs/common';
import { DataModule } from './modules/data/data.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [DataModule, HealthModule],
})
export class AppModule {}
