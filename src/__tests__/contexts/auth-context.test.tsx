import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/contexts/auth-context'

// Mock the API module
vi.mock('@/lib/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  loginWithGoogle: vi.fn(),
  getMe: vi.fn(),
  clearAuth: vi.fn(),
  getAuthToken: vi.fn(),
}))

// Import after mocking
import * as api from '@/lib/api'

// Test component to access auth context
function TestComponent({
  onLogin,
  onLogout,
}: {
  onLogin?: () => void
  onLogout?: () => void
}) {
  const auth = useAuth()

  const handleLogin = async () => {
    try {
      await auth.login('test@example.com', 'password123')
      onLogin?.()
    } catch {
      // Expected in some tests
    }
  }

  const handleLogout = () => {
    auth.logout()
    onLogout?.()
  }

  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.email : 'No user'}</div>
      <div data-testid="loading">{auth.isLoading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="authenticated">
        {auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      <button data-testid="login-btn" onClick={handleLogin}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    tokens: 100,
    emailVerified: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getAuthToken).mockReturnValue(null)
    vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AuthProvider initialization', () => {
    it('should initialize with no user when no token exists', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(screen.getByTestId('user')).toHaveTextContent('No user')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not authenticated')
    })

    it('should load user when token exists', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue('valid-token')
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })

      expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
    })

    it('should clear auth on failed user fetch', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue('invalid-token')
      vi.mocked(api.getMe).mockRejectedValue(new Error('Unauthorized'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      expect(api.clearAuth).toHaveBeenCalled()
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })
  })

  describe('Login', () => {
    it('should login successfully and set user', async () => {
      vi.mocked(api.login).mockResolvedValue({ token: 'new-token' })
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      const onLogin = vi.fn()

      render(
        <AuthProvider>
          <TestComponent onLogin={onLogin} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(api.login).toHaveBeenCalledWith('test@example.com', 'password123')
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })
    })

    it('should handle login failure', async () => {
      vi.mocked(api.login).mockRejectedValue(new Error('Invalid credentials'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(api.login).toHaveBeenCalled()
      })

      // User should remain unauthenticated
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })
  })

  describe('Logout', () => {
    it('should clear user on logout', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue('token')
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })

      const user = userEvent.setup()
      await user.click(screen.getByTestId('logout-btn'))

      expect(api.clearAuth).toHaveBeenCalled()
      expect(screen.getByTestId('user')).toHaveTextContent('No user')
      expect(screen.getByTestId('authenticated')).toHaveTextContent('Not authenticated')
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error
      console.error = vi.fn()

      expect(() => {
        render(<TestComponent />)
      }).toThrow('useAuth must be used within an AuthProvider')

      console.error = consoleError
    })
  })

  describe('Event listeners', () => {
    it('should handle auth-updated event', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not loading')
      })

      // Update mock to return user on next getMe call
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      // Trigger auth-updated event
      await act(async () => {
        window.dispatchEvent(new Event('auth-updated'))
      })

      await waitFor(() => {
        expect(api.getMe).toHaveBeenCalled()
      })
    })
  })

  describe('Register', () => {
    it('should handle registration with verification required', async () => {
      const registerResponse = {
        requiresVerification: true,
        message: 'Please verify your email',
      }
      vi.mocked(api.register).mockResolvedValue(registerResponse)

      // Create a component that tests register
      function RegisterTestComponent() {
        const auth = useAuth()
        const [result, setResult] = useState<string>('')

        const handleRegister = async () => {
          const response = await auth.register('new@example.com', 'password123', 'New User')
          setResult(response.requiresVerification ? 'verification_required' : 'registered')
        }

        return (
          <div>
            <button data-testid="register-btn" onClick={handleRegister}>
              Register
            </button>
            <div data-testid="result">{result}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <RegisterTestComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('register-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('result')).toHaveTextContent('verification_required')
      })

      expect(api.register).toHaveBeenCalledWith('new@example.com', 'password123', 'New User')
    })

    it('should handle registration without verification', async () => {
      const registerResponse = {
        requiresVerification: false,
      }
      vi.mocked(api.register).mockResolvedValue(registerResponse)
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      function RegisterTestComponent() {
        const auth = useAuth()

        const handleRegister = async () => {
          await auth.register('new@example.com', 'password123')
        }

        return (
          <div>
            <button data-testid="register-btn" onClick={handleRegister}>
              Register
            </button>
            <div data-testid="user">{auth.user?.email || 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <RegisterTestComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('register-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })
    })
  })

  describe('Email verification', () => {
    it('should verify email and set user', async () => {
      vi.mocked(api.verifyEmail).mockResolvedValue({ token: 'new-token' })
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      function VerifyTestComponent() {
        const auth = useAuth()

        const handleVerify = async () => {
          await auth.verifyEmail('test@example.com', '123456')
        }

        return (
          <div>
            <button data-testid="verify-btn" onClick={handleVerify}>
              Verify
            </button>
            <div data-testid="user">{auth.user?.email || 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <VerifyTestComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('verify-btn'))

      await waitFor(() => {
        expect(api.verifyEmail).toHaveBeenCalledWith('test@example.com', '123456')
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })
    })

    it('should resend verification', async () => {
      vi.mocked(api.resendVerification).mockResolvedValue(undefined)

      function ResendTestComponent() {
        const auth = useAuth()
        const [sent, setSent] = useState(false)

        const handleResend = async () => {
          await auth.resendVerification('test@example.com')
          setSent(true)
        }

        return (
          <div>
            <button data-testid="resend-btn" onClick={handleResend}>
              Resend
            </button>
            <div data-testid="sent">{sent ? 'Sent' : 'Not sent'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <ResendTestComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('resend-btn'))

      await waitFor(() => {
        expect(api.resendVerification).toHaveBeenCalledWith('test@example.com')
      })

      expect(screen.getByTestId('sent')).toHaveTextContent('Sent')
    })
  })

  describe('Google login', () => {
    it('should login with Google credential', async () => {
      vi.mocked(api.loginWithGoogle).mockResolvedValue({ token: 'google-token' })
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      function GoogleLoginComponent() {
        const auth = useAuth()

        const handleGoogleLogin = async () => {
          await auth.loginWithGoogle('google-credential-token')
        }

        return (
          <div>
            <button data-testid="google-btn" onClick={handleGoogleLogin}>
              Google Login
            </button>
            <div data-testid="user">{auth.user?.email || 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <GoogleLoginComponent />
        </AuthProvider>
      )

      const user = userEvent.setup()
      await user.click(screen.getByTestId('google-btn'))

      await waitFor(() => {
        expect(api.loginWithGoogle).toHaveBeenCalledWith('google-credential-token')
      })

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })
    })
  })

  describe('refreshUser', () => {
    it('should refresh user data', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue('token')
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      function RefreshTestComponent() {
        const auth = useAuth()

        const handleRefresh = async () => {
          await auth.refreshUser()
        }

        return (
          <div>
            <button data-testid="refresh-btn" onClick={handleRefresh}>
              Refresh
            </button>
            <div data-testid="user">{auth.user?.email || 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <RefreshTestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })

      // Update mock to return updated user
      const updatedUser = { ...mockUser, name: 'Updated User' }
      vi.mocked(api.getMe).mockResolvedValue(updatedUser as api.User)

      const user = userEvent.setup()
      await user.click(screen.getByTestId('refresh-btn'))

      await waitFor(() => {
        expect(api.getMe).toHaveBeenCalledTimes(2) // Initial + refresh
      })
    })

    it('should clear auth on refresh failure', async () => {
      vi.mocked(api.getAuthToken).mockReturnValue('token')
      vi.mocked(api.getMe).mockResolvedValue(mockUser as api.User)

      function RefreshTestComponent() {
        const auth = useAuth()

        const handleRefresh = async () => {
          await auth.refreshUser()
        }

        return (
          <div>
            <button data-testid="refresh-btn" onClick={handleRefresh}>
              Refresh
            </button>
            <div data-testid="user">{auth.user?.email || 'No user'}</div>
          </div>
        )
      }

      render(
        <AuthProvider>
          <RefreshTestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
      })

      // Make refresh fail
      vi.mocked(api.getMe).mockRejectedValue(new Error('Session expired'))

      const user = userEvent.setup()
      await user.click(screen.getByTestId('refresh-btn'))

      await waitFor(() => {
        expect(api.clearAuth).toHaveBeenCalled()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('No user')
    })
  })
})

// Need to add useState import
import { useState } from 'react'
