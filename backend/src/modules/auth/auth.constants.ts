export const ACCESS_TOKEN_EXPIRES_IN = '1h';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

export function getRefreshTokenCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60,
  };
}

export function resolveAccessTokenSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-jwt-secret';
  }

  return resolveInsecureDevSecret('JWT_SECRET', 'dev-jwt-secret-change-me');
}

export function resolveRefreshTokenSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-jwt-refresh-secret';
  }

  return resolveInsecureDevSecret('JWT_REFRESH_SECRET', 'dev-jwt-refresh-secret-change-me');
}

// Only fall back to a well-known development secret in local development. Any
// other environment (staging, preview, production, ...) must supply a real
// secret; otherwise tokens could be forged with a publicly-known key.
function resolveInsecureDevSecret(envVarName: string, fallback: string): string {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development') {
    throw new Error(
      `${envVarName} must be set when NODE_ENV is "${nodeEnv}"; refusing to use the insecure development fallback.`
    );
  }

  console.warn(
    `[auth] ${envVarName} is not set — using an insecure development fallback. Do not use this outside local development.`
  );
  return fallback;
}
