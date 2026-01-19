'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyEmail, resendVerification } = useAuth()

  const emailFromUrl = searchParams.get('email') || ''
  const [email] = useState(emailFromUrl)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  // Redirect if no email
  useEffect(() => {
    if (!emailFromUrl) {
      router.push('/auth/register')
    }
  }, [emailFromUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await verifyEmail(email, code)
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)

    try {
      await resendVerification(email)
      setResendCooldown(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
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

        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">
          A verification code has been sent to <strong>{email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            className="auth-input auth-input-code"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            maxLength={6}
            autoFocus
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <p className="auth-footer">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
          </button>
        </p>

        <p className="auth-footer" style={{ marginTop: 8 }}>
          <Link href="/auth/register" className="auth-link">
            ← Back to register
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-container">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
