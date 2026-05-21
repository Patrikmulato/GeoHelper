import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { setupApp } from './app-setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  setupApp(app, { withGlobalPrefix: true });

  const port = Number(process.env.PORT ?? '3001');
  // Fastify defaults to 127.0.0.1 — bind to 0.0.0.0 for Docker and Vercel
  await app.listen(port, '0.0.0.0');
}

bootstrap();
