/**
 * Authentication Context Provider
 * Manages authentication state and provides auth methods
 */
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';

import { setAccessToken, getAccessToken } from '../../lib/api/apiClient';
import { authApi, cartApi } from '../../lib/api/services';
import type { User, LoginRequest, RegisterRequest } from '../../lib/api/types';
import { queryKeys } from '../../lib/api/queryKeys';
import { useCartStore } from '../../stores/cart-store';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
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
          // Token is invalid, clear it
          setAccessToken(null);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

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
      setUser(response.user);

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
      setUser(response.user);

      // Merge guest cart after registration
      await mergeGuestCart();

      // Invalidate cart queries
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);

      // Clear cart on logout
      useCartStore.getState().clearCart();

      // Remove cart queries to clear sensitive data and ensure fresh state
      queryClient.removeQueries({ queryKey: queryKeys.cart() });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
      setAccessToken(null);
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
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
