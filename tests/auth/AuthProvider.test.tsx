import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { adminKeys } from '@/entities/admin/keys';
import { useAdminAccess } from '@/entities/admin/use-admin-access';
import {
  AbortError,
  AuthError,
  NetworkError,
  getAccessToken,
  setAccessToken,
} from '@/lib/api/apiClient';
import { authApi, cartApi } from '@/lib/api/services';

vi.mock('@/lib/api/services', () => ({
  authApi: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    logoutAllSessions: vi.fn(),
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

describe('AuthProvider session actions', () => {
  const loginUser = { id: 'u1', name: 'Jane', email: 'jane@shop.id', createdAt: '2026-01-01' };

  let queryClient: QueryClient;

  function renderAuth() {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
    return renderHook(() => ({ ...useAuth(), access: useAdminAccess() }), { wrapper });
  }

  async function signedIn() {
    const hook = renderAuth();
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    await act(() => hook.result.current.login({ email: 'jane@shop.id', password: 'secret' }));
    return hook;
  }

  beforeEach(() => {
    localStorage.clear();
    setAccessToken(null);
    vi.mocked(cartApi.getActiveCart).mockResolvedValue(null as never);
    vi.mocked(authApi.login).mockImplementation(async () => {
      setAccessToken('fresh-token');
      return { user: loginUser, accessToken: 'fresh-token' };
    });
  });

  afterEach(() => {
    setAccessToken(null);
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('reads the tenant role from /auth/me after login', async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      ...loginUser,
      roles: ['customer'],
      role: 'support',
      permissions: ['support:read'],
    });
    const { result } = await signedIn();

    expect(authApi.getCurrentUser).toHaveBeenCalled();
    expect(result.current.user?.role).toBe('support');
    expect(result.current.isAdmin).toBe(true);
  });

  it('keeps the login user when /auth/me fails right after login', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new NetworkError('Offline'));
    const { result } = await signedIn();

    expect(result.current.user?.email).toBe('jane@shop.id');
    expect(result.current.isAdmin).toBe(false);
  });

  it('signs this device out after revoking every session', async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(loginUser);
    vi.mocked(authApi.logoutAllSessions).mockResolvedValue(undefined);
    const { result } = await signedIn();
    expect(getAccessToken()).toBe('fresh-token');

    await act(() => result.current.logoutAll());

    expect(authApi.logoutAllSessions).toHaveBeenCalledTimes(1);
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('keeps the session when revoking every session fails', async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(loginUser);
    vi.mocked(authApi.logoutAllSessions).mockRejectedValue(new NetworkError('Offline'));
    const { result } = await signedIn();

    await act(async () => {
      await expect(result.current.logoutAll()).rejects.toThrow('Offline');
    });

    expect(getAccessToken()).toBe('fresh-token');
    expect(result.current.user?.email).toBe('jane@shop.id');
  });

  describe('profile save', () => {
    // PATCH /users/me echoes the user with global `roles` but without the
    // tenant `role`/`permissions`, which only GET /auth/me returns.
    function patchEchoes(roles: string[]) {
      vi.mocked(authApi.updateProfile).mockImplementation(async (data) => ({
        ...loginUser,
        name: data.name,
        roles,
      }));
    }

    it('keeps the tenant role of a manager without a global admin role', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        ...loginUser,
        roles: ['customer'],
        role: 'manager',
        permissions: ['orders:read', 'catalog:read', 'analytics:read'],
      });
      patchEchoes(['customer']);
      const { result } = await signedIn();
      expect(result.current.access.canEnter).toBe(true);

      let saved: Awaited<ReturnType<typeof result.current.updateProfile>> | undefined;
      await act(async () => {
        saved = await result.current.updateProfile({ name: 'Jane Doe' });
      });

      expect(result.current.user?.name).toBe('Jane Doe');
      expect(saved?.role).toBe('manager');
      expect(result.current.access.role).toBe('manager');
      expect(result.current.access.canEnter).toBe(true);
      expect(result.current.access.can('orders:read')).toBe(true);
      expect(result.current.access.can('staff:read')).toBe(false);
      expect(result.current.isAdmin).toBe(true);
    });

    it('keeps a revoked global admin locked out of the admin area', async () => {
      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        ...loginUser,
        roles: ['admin'],
        role: 'customer',
        permissions: [],
      });
      patchEchoes(['admin']);
      const { result } = await signedIn();
      expect(result.current.access.canEnter).toBe(false);

      await act(async () => {
        await result.current.updateProfile({ name: 'Jane Doe' });
      });

      expect(result.current.user?.name).toBe('Jane Doe');
      expect(result.current.user?.permissions).toEqual([]);
      expect(result.current.access.canEnter).toBe(false);
      expect(result.current.access.isPlatformAdmin).toBe(false);
      expect(result.current.access.can('catalog:read')).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  it('drops cached admin data on sign-out', async () => {
    vi.mocked(authApi.getCurrentUser).mockResolvedValue(loginUser);
    vi.mocked(authApi.logout).mockResolvedValue(undefined as never);
    const { result } = await signedIn();
    queryClient.setQueryData(adminKeys.categories(), [{ id: 'c1' }]);

    await act(() => result.current.logout());

    expect(queryClient.getQueryData(adminKeys.categories())).toBeUndefined();
  });
});
