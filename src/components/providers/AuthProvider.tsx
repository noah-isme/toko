/**
 * Authentication Context Provider
 * Manages authentication state and provides auth methods
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';

import { getAdminAccess } from '../../entities/admin/access';
import { AuthError, getAccessToken, setAccessToken } from '../../lib/api/apiClient';
import { queryKeys } from '../../lib/api/queryKeys';
import { authApi, cartApi } from '../../lib/api/services';
import type { User, LoginRequest, RegisterRequest } from '../../lib/api/types';
import { useCartStore } from '../../stores/cart-store';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * True when the signed-in user may enter the admin area: any staff role in the
   * current tenant (`permissions` from `/auth/me`) or the global `admin` role.
   * Per-section access comes from `useAdminAccess()`.
   */
  isAdmin: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Revokes every session of the user (`POST /auth/logout/all`), including this
   * one, then clears the local session like `logout`.
   */
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name: string; phone?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mergeGuestCart = useCartStore((state) => state.mergeGuestCart);
  const queryClient = useQueryClient();

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();

      if (token) {
        try {
          // Parallel fetch: Get User & Get Active Cart
          const [currentUser, activeCart] = await Promise.all([
            authApi.getCurrentUser(),
            cartApi.getActiveCart().catch(() => null), // Gracefully handle if no active cart
          ]);

          setUser(currentUser);

          // If server returns an active cart, force-update our store
          if (activeCart?.id) {
            useCartStore.getState().setCartId(activeCart.id);
          }

          // Ensure cart is synced after initialization
          await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
        } catch (error) {
          // Only clear token if it is explicitly an unauthorized API error (401 or 403)
          if (shouldEvictAccessToken(error)) {
            setAccessToken(null);
          } else {
            console.error('[AuthProvider] Auth initialization error (non-auth related):', error);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [queryClient]);

  // Setup auto-refresh token every 14 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(
      async () => {
        try {
          await authApi.refresh();
        } catch (error) {
          console.error('Failed to refresh token:', error);
        }
      },
      14 * 60 * 1000,
    ); // 14 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      setUser(await withTenantRole(response.user));

      // Merge guest cart after login
      await mergeGuestCart();

      // Invalidate cart queries to ensure UI syncs with new user's cart
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      setUser(await withTenantRole(response.user));

      // Merge guest cart after registration
      await mergeGuestCart();

      // Invalidate cart queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalSession = () => {
    setUser(null);

    // Clear cart on logout
    useCartStore.getState().clearCart();

    // Remove cart queries to clear sensitive data and ensure fresh state
    queryClient.removeQueries({ queryKey: queryKeys.cart() });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      clearLocalSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logoutAll = async () => {
    // The backend revokes this device's refresh session too and clears the
    // refresh cookie; the access token would otherwise stay usable until it
    // expires, so drop it and the local session right away.
    await authApi.logoutAllSessions();
    setAccessToken(null);
    clearLocalSession();
    queryClient.removeQueries({ queryKey: ['auth'] });
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      if (shouldEvictAccessToken(error)) {
        setUser(null);
        setAccessToken(null);
      }
    }
  };

  const updateProfile = async (data: { name: string; phone?: string }) => {
    const updatedUser = await authApi.updateProfile(data);
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: getAdminAccess(user).canEnter,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Case-insensitive role check. The backend sends lowercase role slugs, but the
 * comparison is normalised so a differently cased payload still matches.
 */
export function hasRole(user: User | null, role: string): boolean {
  if (!user?.roles) return false;
  const target = role.toLowerCase();
  return user.roles.some((entry) => entry.toLowerCase() === target);
}

/**
 * Login and register responses omit the tenant `role`/`permissions`, which only
 * `GET /auth/me` returns; read them so admin access is known right after sign-in.
 * Falls back to the auth response user when `/auth/me` fails.
 */
async function withTenantRole(user: User): Promise<User> {
  try {
    return await authApi.getCurrentUser();
  } catch {
    return user;
  }
}

function shouldEvictAccessToken(error: unknown): boolean {
  if (error instanceof AuthError) {
    return true;
  }

  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false;
  }

  return error.status === 401 || error.status === 403;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Used by route guards that may be rendered independently in component tests.
 * The app shell always supplies AuthProvider; an absent provider only occurs in
 * isolated rendering where the guarded content should stay inspectable.
 */
export function useOptionalAuth() {
  return useContext(AuthContext);
}
