'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

export default function RegisterPage() {
  const router = useRouter()
  const { register, loginWithGoogle, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await register(email, password, name || undefined)
      if (response.requiresVerification) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true)
    setError('')
    try {
      await loginWithGoogle(credential)
      router.push('/')
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

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Sign up to start using AI</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            className="auth-input"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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

          <input
            type="password"
            className="auth-input"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Google Sign In */}
        <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setError} disabled={loading} />

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/auth/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
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
