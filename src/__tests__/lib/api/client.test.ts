import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  setAuthToken,
  getAuthToken,
  clearAuth,
  fetchApi,
  apiClient,
  AuthenticationError,
  ForbiddenError,
  InsufficientTokensError,
  getApiBaseUrl,
  navigateWithAuth,
  getCrossDomainUrl,
} from '@/lib/api/client'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockClear()
    ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockClear()
    global.fetch = vi.fn()
    // Reset in-memory token by setting to null
    setAuthToken(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Management', () => {
    it('should set auth token in localStorage', () => {
      const token = 'test-token-123'
      setAuthToken(token)

      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', token)
    })

    it('should remove token from localStorage when set to null', () => {
      setAuthToken(null)

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should get auth token from memory first', () => {
      const token = 'memory-token'
      setAuthToken(token)

      const result = getAuthToken()

      expect(result).toBe(token)
    })

    it('should get auth token from localStorage if not in memory', () => {
      const storedToken = 'stored-token'
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(storedToken)
      // Simulate fresh state by clearing memory token
      setAuthToken(null)
      ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(storedToken)

      const result = getAuthToken()

      expect(localStorage.getItem).toHaveBeenCalledWith('auth_token')
      expect(result).toBe(storedToken)
    })

    it('should clear all auth data', () => {
      setAuthToken('test-token')
      clearAuth()

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('fetchApi', () => {
    it('should make GET request with auth token', async () => {
      const mockData = { id: 1, name: 'Test' }
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockData }),
      })

      setAuthToken('test-token')
      const result = await fetchApi('/api/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should make request without auth token when not set', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await fetchApi('/api/public')

      const callArgs = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(callArgs[1].headers).not.toHaveProperty('Authorization')
    })

    it('should throw AuthenticationError on 401 response', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      })

      setAuthToken('expired-token')

      await expect(fetchApi('/api/protected')).rejects.toThrow(AuthenticationError)
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should redirect to login with returnUrl on 401', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      })

      window.location.pathname = '/account/profile'
      window.location.search = '?tab=settings'

      try {
        await fetchApi('/api/protected')
      } catch {
        // Expected to throw
      }

      expect(window.location.href).toContain('/auth/login?expired=1&returnUrl=')
    })

    it('should throw ForbiddenError on 403 response', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Admin access required' }),
      })

      await expect(fetchApi('/api/admin')).rejects.toThrow(ForbiddenError)
    })

    it('should throw ForbiddenError with message from response', async () => {
      const errorMessage = 'You do not have permission'
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: errorMessage }),
      })

      await expect(fetchApi('/api/admin')).rejects.toThrow(errorMessage)
    })

    it('should throw generic error on failed request', async () => {
      const errorMessage = 'Something went wrong'
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: errorMessage }),
      })

      await expect(fetchApi('/api/test')).rejects.toThrow(errorMessage)
    })

    it('should handle request with custom headers', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await fetchApi('/api/test', {
        headers: { 'X-Custom-Header': 'value' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'value',
          }),
        })
      )
    })
  })

  describe('apiClient methods', () => {
    beforeEach(() => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { result: 'ok' } }),
      })
    })

    it('should make GET request', async () => {
      await apiClient.get('/api/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should make POST request with data', async () => {
      const postData = { name: 'Test' }
      await apiClient.post('/api/test', postData)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      )
    })

    it('should make PUT request with data', async () => {
      const putData = { id: 1, name: 'Updated' }
      await apiClient.put('/api/test/1', putData)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      )
    })

    it('should make PATCH request with data', async () => {
      const patchData = { name: 'Patched' }
      await apiClient.patch('/api/test/1', patchData)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(patchData),
        })
      )
    })

    it('should make DELETE request', async () => {
      await apiClient.delete('/api/test/1')

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/test/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Error classes', () => {
    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError()
      expect(error.name).toBe('AuthenticationError')
      expect(error.message).toBe('Authentication required')
    })

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error')
      expect(error.name).toBe('AuthenticationError')
      expect(error.message).toBe('Custom auth error')
    })

    it('should create ForbiddenError with default message', () => {
      const error = new ForbiddenError()
      expect(error.name).toBe('ForbiddenError')
      expect(error.message).toBe('Access denied')
    })

    it('should create ForbiddenError with custom message', () => {
      const error = new ForbiddenError('Custom forbidden error')
      expect(error.name).toBe('ForbiddenError')
      expect(error.message).toBe('Custom forbidden error')
    })

    it('should create InsufficientTokensError with remaining and required', () => {
      const error = new InsufficientTokensError(10, 100)
      expect(error.name).toBe('InsufficientTokensError')
      expect(error.message).toContain('10')
      expect(error.message).toContain('100')
    })
  })

  describe('Utility functions', () => {
    it('should return API base URL', () => {
      const baseUrl = getApiBaseUrl()
      expect(baseUrl).toBe('http://localhost:4000')
    })

    it('should navigate with auth token in new tab', () => {
      setAuthToken('test-token')
      const mockOpen = vi.fn()
      window.open = mockOpen

      navigateWithAuth('/pricing', true)

      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('token=test-token'), '_blank')
    })

    it('should navigate with auth token in same window', () => {
      setAuthToken('test-token')
      window.location.hostname = 'localhost'

      navigateWithAuth('/pricing', false)

      expect(window.location.href).toContain('token=test-token')
    })

    it('should not navigate without auth token', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      setAuthToken(null)
      const originalHref = window.location.href

      navigateWithAuth('/pricing')

      expect(warnSpy).toHaveBeenCalledWith('No auth token found')
      warnSpy.mockRestore()
    })

    it('should get cross-domain URL with token', () => {
      setAuthToken('test-token')
      window.location.hostname = 'localhost'

      const url = getCrossDomainUrl('/pricing')

      expect(url).toContain('token=test-token')
      expect(url).toContain('/pricing')
    })

    it('should return null for cross-domain URL without token', () => {
      setAuthToken(null)

      const url = getCrossDomainUrl('/pricing')

      expect(url).toBeNull()
    })

    it('should append token with & if path has query params', () => {
      setAuthToken('test-token')
      window.location.hostname = 'localhost'

      const url = getCrossDomainUrl('/pricing?plan=pro')

      expect(url).toContain('?plan=pro&token=test-token')
    })
  })
})
