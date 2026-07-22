import { Module } from '@nestjs/common';
import { DataModule } from './modules/data/data.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';

@Module({
  imports: [DataModule, HealthModule, PrismaModule],
})
export class AppModule {}
