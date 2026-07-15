import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { AbortError, AuthError, NetworkError, setAccessToken } from '@/lib/api/apiClient';
import { authApi, cartApi } from '@/lib/api/services';

vi.mock('@/lib/api/services', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    register: vi.fn(),
    updateProfile: vi.fn(),
  },
  cartApi: {
    getActiveCart: vi.fn(),
  },
}));

function AuthState() {
  const { isLoading } = useAuth();
  return <div>{isLoading ? 'loading' : 'ready'}</div>;
}

function renderProvider(children: ReactNode = <AuthState />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AuthProvider initialization', () => {
  beforeEach(() => {
    vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
    setAccessToken(null);
    localStorage.setItem('accessToken', 'persisted-token');
  });

  afterEach(() => {
    setAccessToken(null);
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('preserves the access token when rapid navigation aborts initialization', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new AbortError('Navigation cancelled'));

    renderProvider();

    await screen.findByText('ready');
    expect(localStorage.getItem('accessToken')).toBe('persisted-token');
  });

  it('preserves the access token during a transient network failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new NetworkError('Offline'));

    renderProvider();

    await screen.findByText('ready');
    expect(localStorage.getItem('accessToken')).toBe('persisted-token');
  });

  it('evicts the access token after an explicit unauthorized response', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(
      new AuthError('Unauthorized', 'UNAUTHORIZED', 401),
    );

    renderProvider();

    await screen.findByText('ready');
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
  });
});
