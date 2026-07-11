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
  VerifyEmailRequest,
  ResendVerificationRequest,
  UpdateProfileRequest,
  MessageResponse,
  SessionInfo,
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
    const response = await apiClient<ApiResponse<User>>('/users/me', {
      method: 'GET',
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Request password reset email
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse<MessageResponse>>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await apiClient<ApiResponse<MessageResponse>>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Verify email address with token
   */
  async verifyEmail(data: VerifyEmailRequest): Promise<MessageResponse> {
    const response = await apiClient<ApiResponse<MessageResponse>>('/auth/email/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerification(data: ResendVerificationRequest): Promise<MessageResponse> {
    const response = await apiClient<ApiResponse<MessageResponse>>('/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Update current user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiClient<ApiResponse<User>>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Get active sessions for current user
   */
  async getSessions(): Promise<SessionInfo[]> {
    const response = await apiClient<ApiResponse<SessionInfo[]>>('/auth/sessions', {
      method: 'GET',
      requiresAuth: true,
    });
    return response.data;
  },

  /**
   * Logout all sessions
   */
  async logoutAllSessions(): Promise<MessageResponse> {
    const response = await apiClient<ApiResponse<MessageResponse>>('/auth/logout/all', {
      method: 'POST',
      requiresAuth: true,
    });
    return response.data;
  },
};
