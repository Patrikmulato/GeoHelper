import { ValidationPipe } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ValidationExceptionFilter } from './common/filters/validation.exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { getAppConfig } from './config/app.config.js';
import { setupSwagger } from './swagger.config.js';

type SetupOptions = {
  withGlobalPrefix?: boolean;
};

export function setupApp(app: NestFastifyApplication, options: SetupOptions = {}): void {
  const { withGlobalPrefix = true } = options;
  const appConfig = getAppConfig();

  // Build allowed origins - supports localhost, env vars, and Vercel preview deployments
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://geo-helpers.vercel.app',
    appConfig.corsOrigin,
    appConfig.frontendUrl,
  ].filter((origin): origin is string => Boolean(origin));

  // CORS configuration with dynamic Vercel preview support
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      // Check if origin is in allowlist
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Allow any Vercel preview deployment from your account (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  };

  // Type assertion: Fastify CORS types are strict about origin function signature,
  // but our implementation works correctly at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.enableCors(corsOptions as any);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Register global filters (exception handling)
  app.useGlobalFilters(new ValidationExceptionFilter(), new HttpExceptionFilter());

  // Register global interceptors (response standardization)
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (withGlobalPrefix) {
    app.setGlobalPrefix('api');
  }

  // API docs at /api/docs (Swagger UI + OpenAPI JSON).
  setupSwagger(app);
}
