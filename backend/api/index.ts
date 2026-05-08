import 'reflect-metadata';
import express from 'express';
import type { Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app-setup.js';

let cachedHandler: ((req: Request, res: Response) => void) | null = null;

async function getHandler() {
    if (cachedHandler) {
        return cachedHandler;
    }

    const expressApp = express();
    const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    setupApp(nestApp, { withGlobalPrefix: true });
    await nestApp.init();

    cachedHandler = expressApp;
    return cachedHandler;
}

export default async function handler(req: Request, res: Response) {
    const nestHandler = await getHandler();
    return nestHandler(req, res);
}