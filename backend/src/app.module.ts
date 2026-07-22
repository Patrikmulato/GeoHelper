import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LoggerModule } from './common/logger/logger.module.js';
import { CorrelationMiddleware } from './common/middlewares/correlation.middleware.js';
import { DataModule } from './modules/data/data.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';

@Module({
  imports: [LoggerModule, DataModule, HealthModule, PrismaModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
