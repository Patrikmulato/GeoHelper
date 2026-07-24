'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiClient } from '@/lib/api/client';
import * as authApi from '@/lib/api/auth';
import type { AuthResponse, AuthUser, UserRole } from '@/types/auth';

const REFRESH_TOKEN_STORAGE_KEY = 'gh_refresh_token';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUser | null;
  role: UserRole | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function persistRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const accessTokenRef = useRef<string | null>(null);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  // Bumped on every explicit logout so a refresh that was already in flight
  // cannot resurrect the session after the user has signed out.
  const sessionEpochRef = useRef(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const applySession = useCallback((session: AuthResponse) => {
    accessTokenRef.current = session.accessToken;
    persistRefreshToken(session.refreshToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    sessionEpochRef.current += 1;
    accessTokenRef.current = null;
    persistRefreshToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Bumps the session epoch and drops the stored refresh token so no in-flight
  // or future refresh can reuse it, without touching the current access token
  // (still needed to authorize the logout request itself).
  const invalidatePendingRefresh = useCallback(() => {
    sessionEpochRef.current += 1;
    persistRefreshToken(null);
  }, []);

  // Single-flight refresh: concurrent 401s (and Strict Mode double-invokes) share
  // one rotation so the backend's single stored refresh-token hash is not raced.
  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const epochAtStart = sessionEpochRef.current;

    const promise = (async () => {
      const storedRefreshToken = readStoredRefreshToken();
      if (!storedRefreshToken) {
        clearSession();
        return null;
      }
      try {
        const session = await authApi.refresh(storedRefreshToken);
        // A logout may have completed while this request was in flight; discard
        // the result instead of resurrecting a session the user already left.
        if (sessionEpochRef.current !== epochAtStart) {
          return null;
        }
        applySession(session);
        return session.accessToken;
      } catch {
        if (sessionEpochRef.current === epochAtStart) {
          clearSession();
        }
        return null;
      }
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = promise;
    return promise;
  }, [applySession, clearSession]);

  // Register token hooks with the shared API client (access token + 401 refresh).
  useEffect(() => {
    apiClient.setAccessTokenProvider(() => accessTokenRef.current);
    apiClient.setTokenRefresher(refreshSession);

    return () => {
      apiClient.setAccessTokenProvider(null);
      apiClient.setTokenRefresher(null);
    };
  }, [refreshSession]);

  // Bootstrap the session on first load from the stored refresh token.
  useEffect(() => {
    async function bootstrap() {
      const storedRefreshToken = readStoredRefreshToken();
      if (!storedRefreshToken) {
        setStatus('unauthenticated');
        return;
      }

      await refreshSession();
    }

    void bootstrap();
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.register({ email, password });
      applySession(session);
      return session.user;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    // Immediately invalidate any in-flight refresh and stop future refreshes
    // from reusing the soon-to-be-revoked refresh token, but keep the current
    // access token in place until the server call has been attempted so its
    // Authorization header still identifies the user being revoked.
    invalidatePendingRefresh();
    try {
      await authApi.logout();
    } catch {
      // Best-effort server-side revocation; local session is cleared regardless.
    } finally {
      clearSession();
    }
  }, [invalidatePendingRefresh, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      login,
      register,
      logout,
    }),
    [user, status, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
