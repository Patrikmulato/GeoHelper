import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app-setup.js';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    setupApp(app, { withGlobalPrefix: true });

    const port = Number(process.env.PORT ?? '3001');
    await app.listen(port, '0.0.0.0');
}

bootstrap();
