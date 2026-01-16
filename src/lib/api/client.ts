/**
 * HTTP Client - Base API utilities
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Auth token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token')
  }
  return authToken
}

export function clearAuth() {
  authToken = null
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

// API response type
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Generic fetch helper
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const json: ApiResponse<T> = await response.json()

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed')
  }

  return json.data as T
}

// For streaming endpoints
export function getApiBaseUrl(): string {
  return API_BASE_URL
}

// Error class for insufficient tokens
export class InsufficientTokensError extends Error {
  constructor(remaining: number, required: number) {
    super(`Không đủ token. Còn lại: ${remaining}, cần: ${required}. Vui lòng nạp thêm.`)
    this.name = 'InsufficientTokensError'
  }
}
