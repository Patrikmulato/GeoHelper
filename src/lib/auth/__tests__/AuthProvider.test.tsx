// src/lib/auth/__tests__/AuthProvider.test.tsx
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { apiClient } from '@/lib/api/client';
import * as authApi from '@/lib/api/auth';
import type { AuthResponse } from '@/types/auth';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    setAccessTokenProvider: jest.fn(),
    setTokenRefresher: jest.fn(),
  },
}));

jest.mock('@/lib/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
  getMe: jest.fn(),
  logout: jest.fn(),
}));

const REFRESH_TOKEN_KEY = 'gh_refresh_token';

function makeSession(overrides?: Partial<AuthResponse>): AuthResponse {
  return {
    accessToken: 'access-token',
    refreshToken: 'rotated-refresh-token',
    user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
    ...overrides,
  };
}

function TestConsumer() {
  const { status, user, logout } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user">{user?.email ?? ''}</span>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function getLatestRefresher(): () => Promise<string | null> {
  const calls = (apiClient.setTokenRefresher as jest.Mock).mock.calls;
  return calls[calls.length - 1][0];
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  it('single-flights concurrent refresh calls into one network request', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));

    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-refresh-token');

    let resolveRefresh: (session: AuthResponse) => void = () => {};
    (authApi.refresh as jest.Mock).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const refresher = getLatestRefresher();

    let p1: Promise<string | null>;
    let p2: Promise<string | null>;
    act(() => {
      p1 = refresher();
      p2 = refresher();
    });

    await act(async () => {
      resolveRefresh(makeSession());
      await Promise.all([p1, p2]);
    });

    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('user@example.com');
  });

  it('discards a refresh that resolves after logout has already started', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-refresh-token');

    let resolveRefresh: (session: AuthResponse) => void = () => {};
    (authApi.refresh as jest.Mock).mockReturnValue(
      new Promise<AuthResponse>((resolve) => {
        resolveRefresh = resolve;
      })
    );
    (authApi.logout as jest.Mock).mockResolvedValue({ revoked: true });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Bootstrap kicks off a refresh from the stored token; it stays pending.
    await waitFor(() => expect(authApi.refresh).toHaveBeenCalledTimes(1));

    // User logs out while that refresh is still in flight.
    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();

    // The stale refresh now resolves — it must not resurrect the session.
    await act(async () => {
      resolveRefresh(makeSession());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('');
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('logout calls the server before the access token is cleared', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'stored-refresh-token');
    (authApi.refresh as jest.Mock).mockResolvedValue(makeSession());

    let accessTokenDuringLogoutCall: string | null | undefined;
    (authApi.logout as jest.Mock).mockImplementation(async () => {
      const provider = (apiClient.setAccessTokenProvider as jest.Mock).mock.calls[0][0] as () =>
        string | null;
      accessTokenDuringLogoutCall = provider();
      return { revoked: true };
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

    await userEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'));
    expect(accessTokenDuringLogoutCall).toBe('access-token');
  });
});
