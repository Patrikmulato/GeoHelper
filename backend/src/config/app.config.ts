export type AppConfig = {
  port: number;
  nodeEnv: string;
  corsOrigin?: string;
  frontendUrl?: string;
};

function requireProductionEnvVar(name: string): void {
  if (!process.env[name]) {
    throw new Error(`${name} is required in production`);
  }
}

export function getAppConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const port = Number(process.env.PORT ?? '3001');

  if (Number.isNaN(port) || port <= 0) {
    throw new Error('PORT must be a positive number');
  }

  if (nodeEnv === 'production') {
    requireProductionEnvVar('DATABASE_URL');
    requireProductionEnvVar('JWT_SECRET');
    requireProductionEnvVar('JWT_REFRESH_SECRET');
  }

  return {
    port,
    nodeEnv,
    corsOrigin: process.env.CORS_ORIGIN,
    frontendUrl: process.env.FRONTEND_URL,
  };
}
