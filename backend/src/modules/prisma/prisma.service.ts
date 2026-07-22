import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '../../config/database.config.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = PrismaService.resolveDatabaseUrl();
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  private static resolveDatabaseUrl(): string {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    // Tests and ad-hoc scripts may not preload dotenv.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv/config');

    return getDatabaseUrl();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
