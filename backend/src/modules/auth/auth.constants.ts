export const ACCESS_TOKEN_EXPIRES_IN = '1h';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

export function resolveAccessTokenSecret(): string {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-jwt-secret';
  }

  return 'dev-jwt-secret-change-me';
}

export function resolveRefreshTokenSecret(): string {
  if (process.env.JWT_REFRESH_SECRET) {
    return process.env.JWT_REFRESH_SECRET;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'test-jwt-refresh-secret';
  }

  return 'dev-jwt-refresh-secret-change-me';
}
