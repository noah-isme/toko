/**
 * Authentication API Service
 */
import { apiClient, setAccessToken } from '../apiClient';
import type {
  ApiResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  RefreshTokenResponse,
  User,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types';

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient<ApiResponse<AuthResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient<ApiResponse<AuthResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  /**
   * Refresh access token using refresh token cookie
   */
  async refresh(): Promise<RefreshTokenResponse> {
    const response = await apiClient<ApiResponse<RefreshTokenResponse>>('/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await apiClient('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    });
    setAccessToken(null);
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient<ApiResponse<User>>('/auth/me', {
      method: 'GET',
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Request password reset email
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse<{ message: string }>>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse<{ message: string }>>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};
