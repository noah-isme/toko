import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { alertsKeys } from '@/entities/alerts/keys';
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

function renderProvider(
  children: ReactNode = <AuthState />,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
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

describe('AuthProvider logout', () => {
  afterEach(() => {
    setAccessToken(null);
    vi.clearAllMocks();
  });

  it("removes the user's cached alerts so the next account cannot see them", async () => {
    vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({ id: 'u1' } as never);
    vi.mocked(authApi.logout).mockResolvedValue(undefined as never);
    localStorage.setItem('accessToken', 'persisted-token');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(alertsKeys.product('p1'), [{ id: 'a1' }]);
    queryClient.setQueryData(alertsKeys.everything(), [{ id: 'a1' }]);
    queryClient.setQueryData(alertsKeys.list({ page: 1 }), { data: [] });
    let logout: (() => Promise<void>) | undefined;
    function Capture() {
      logout = useAuth().logout;
      return null;
    }

    renderProvider(<Capture />, queryClient);
    await waitFor(() => expect(logout).toBeDefined());
    await act(async () => {
      await logout?.();
    });

    expect(queryClient.getQueriesData({ queryKey: alertsKeys.all })).toEqual([]);
  });
});
