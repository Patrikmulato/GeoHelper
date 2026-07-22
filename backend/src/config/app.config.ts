export type AppConfig = {
  port: number;
  nodeEnv: string;
  corsOrigin?: string;
  frontendUrl?: string;
};

export function getAppConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? '3001'),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN,
    frontendUrl: process.env.FRONTEND_URL,
  };
}
