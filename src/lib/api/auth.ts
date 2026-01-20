/**
 * Authentication API
 */

import { fetchApi, setAuthToken, getApiBaseUrl } from './client'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'user' | 'admin'
  creditsUsed: number
  totalSpentUsd: number
  isPro: boolean
  proExpiresAt: string | null
  createdAt?: string
  tokenBalance: number
}

export interface AuthData {
  token: string
  user: User
}

export interface RegisterResponse {
  requiresVerification?: boolean
  email?: string
  message?: string
  token?: string
  user?: User
}

// Check if user has enough tokens
export function hasEnoughTokens(user: User | null, estimatedTokens: number = 1000): boolean {
  if (!user) return false
  return user.tokenBalance >= estimatedTokens
}

// Get remaining tokens
export function getRemainingTokens(user: User | null): number {
  if (!user) return 0
  return Math.max(0, user.tokenBalance)
}

export async function login(email: string, password: string): Promise<AuthData> {
  const data = await fetchApi<AuthData>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAuthToken(data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<RegisterResponse> {
  const data = await fetchApi<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
  if (data.token && data.user) {
    setAuthToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }
  return data
}

export async function verifyEmail(email: string, code: string): Promise<AuthData> {
  const data = await fetchApi<AuthData>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
  setAuthToken(data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function loginWithGoogle(credential: string, clientId?: string): Promise<AuthData> {
  const data = await fetchApi<AuthData>('/api/auth/google/token', {
    method: 'POST',
    body: JSON.stringify({ credential, clientId }),
  })
  setAuthToken(data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function getGoogleAuthUrl(): string {
  // Pass current origin as redirect_uri so backend knows where to redirect after OAuth
  const redirectUri = typeof window !== 'undefined' ? window.location.origin : ''
  return `${getApiBaseUrl()}/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`
}

export async function getMe(): Promise<User> {
  return fetchApi<User>('/api/auth/me')
}

export async function updateProfile(data: { name?: string }): Promise<User> {
  return fetchApi<User>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deactivateAccount(): Promise<{ message: string }> {
  return fetchApi<{ message: string }>('/api/auth/account', {
    method: 'DELETE',
  })
}
