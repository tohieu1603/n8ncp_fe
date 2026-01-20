'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, loginWithGoogle, isAuthenticated, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Check if session expired (redirected from 401)
  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setSessionExpired(true)
    }
  }, [searchParams])

  // Get return URL from query params
  const returnUrl = searchParams.get('returnUrl')

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // If returnUrl provided and valid, redirect there
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl)
      } else if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    }
  }, [isAuthenticated, user, router, returnUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)
      // Redirect to returnUrl if provided and valid
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl)
      } else if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      // Check if needs verification
      if (errorMessage.includes('verify') || errorMessage.includes('verification')) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
        return
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true)
    setError('')
    try {
      const user = await loginWithGoogle(credential)
      // Redirect to returnUrl if provided and valid
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl)
      } else if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <Link href="/" className="auth-logo">
          <div className="auth-logo-icon">
            <Sparkles size={24} color="white" />
          </div>
          <span>ImageGen AI</span>
        </Link>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <input
            type="password"
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {sessionExpired && (
            <div className="auth-warning" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 8,
              color: '#fbbf24',
              fontSize: 14,
              marginBottom: 8,
            }}>
              <AlertCircle size={18} />
              Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Google Sign In */}
        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} disabled={loading} />

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-container">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

// Google Sign-In Button Component
let googleCallbackRef: ((credential: string) => void) | null = null

function GoogleSignInButton({
  onSuccess,
  onError,
  disabled,
}: {
  onSuccess: (credential: string) => void
  onError: (error: string) => void
  disabled?: boolean
}) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    googleCallbackRef = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => setIsLoaded(true)
      document.head.appendChild(script)
    } else if (window.google) {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !GOOGLE_CLIENT_ID || !buttonRef.current || initializedRef.current) return

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: { credential: string }) => {
          if (response.credential && googleCallbackRef) {
            googleCallbackRef(response.credential)
          }
        },
      })

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        shape: 'rectangular',
      })

      initializedRef.current = true
    } catch {
      onError('Failed to initialize Google Sign-In')
    }
  }, [isLoaded, onError])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div
      ref={buttonRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    />
  )
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
          renderButton: (element: HTMLElement, config: { theme: string; size: string; width?: string; text?: string; shape?: string }) => void
        }
      }
    }
  }
}
