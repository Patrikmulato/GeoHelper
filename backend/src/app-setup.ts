import { ValidationPipe, ExceptionFilter, NestInterceptor } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

type AppWithConfig = {
  enableCors: (options: { origin: string[] }) => void;
  useGlobalPipes: (...pipes: ValidationPipe[]) => void;
  setGlobalPrefix: (prefix: string) => void;
  useGlobalFilters: (filter: ExceptionFilter) => void;
  useGlobalInterceptors: (interceptor: NestInterceptor) => void;
};

type SetupOptions = {
  withGlobalPrefix?: boolean;
};

export function setupApp(app: AppWithConfig, options: SetupOptions = {}): void {
  const { withGlobalPrefix = true } = options;
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Register global filters (exception handling)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Register global interceptors (response standardization)
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (withGlobalPrefix) {
    app.setGlobalPrefix('api');
  }
}
