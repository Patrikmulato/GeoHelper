import { ValidationPipe } from '@nestjs/common';

type AppWithConfig = {
    enableCors: (options: { origin: string[] }) => void;
    useGlobalPipes: (...pipes: ValidationPipe[]) => void;
    setGlobalPrefix: (prefix: string) => void;
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
        }),
    );

    if (withGlobalPrefix) {
        app.setGlobalPrefix('api');
    }
}