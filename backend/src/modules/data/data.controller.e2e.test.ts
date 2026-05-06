import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module.js';
import type { INestApplication } from '@nestjs/common';

const validPayload = {
    sideFilter: 'all',
    lineFilter: 'all',
    euPlateFilter: 'all',
    cameraGenFilter: 'all',
    coverageYearFilter: 'all',
    carColorFilter: 'all',
    vehicleTypeFilter: 'all',
};

describe('DataController /api/data/filter validation (e2e)', () => {
    let app: INestApplication;

    before(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleRef.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();
    });

    after(async () => {
        await app.close();
    });

    it('accepts valid payload', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/data/filter')
            .send(validPayload)
            .expect(201);

        assert.ok(Array.isArray(res.body.countries));
    });

    it('rejects unknown properties', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/data/filter')
            .send({ ...validPayload, unknownField: 'x' })
            .expect(400);

        assert.ok(Array.isArray(res.body.message));
        assert.ok(res.body.message.some((m: string) => m.includes('unknownField')));
    });

    it('rejects invalid enum values', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/data/filter')
            .send({ ...validPayload, cameraGenFilter: '9' })
            .expect(400);

        assert.ok(Array.isArray(res.body.message));
        assert.ok(res.body.message.some((m: string) => m.includes('cameraGenFilter')));
    });

    it('rejects malformed coverageYearFilter', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/data/filter')
            .send({ ...validPayload, coverageYearFilter: '20xx' })
            .expect(400);

        assert.ok(Array.isArray(res.body.message));
        assert.ok(
            res.body.message.some((m: string) => m.includes('coverageYearFilter')),
        );
    });
});
