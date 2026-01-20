'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { setAuthToken, getMe } from '@/lib/api'

/**
 * Component xử lý nhận token từ URL parameter
 * Cho phép login qua link: https://domain.com?token=xxx
 */
export function TokenReceiver() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const processingRef = useRef(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token || processingRef.current) return

    // Mark as processing to prevent duplicate runs
    processingRef.current = true
    setIsLoading(true)

    const handleToken = async () => {
      try {
        setAuthToken(token)
        const user = await getMe()
        localStorage.setItem('user', JSON.stringify(user))

        setStatus('success')

        // Delay để hiển thị success state
        await new Promise(resolve => setTimeout(resolve, 800))

        // Remove token from URL and redirect (no reload needed)
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        const cleanUrl = newUrl.pathname + (newUrl.search || '')

        // Use window.history to avoid triggering React re-renders
        window.history.replaceState({}, '', cleanUrl || pathname)

        // Dispatch custom event to notify auth context
        window.dispatchEvent(new Event('auth-updated'))

        setIsLoading(false)
      } catch (err) {
        console.error('Invalid token:', err)
        setStatus('error')

        // Delay để hiển thị error state
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Token không hợp lệ, xóa khỏi URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        window.history.replaceState({}, '', newUrl.pathname + (newUrl.search || '') || pathname)

        setIsLoading(false)
      } finally {
        processingRef.current = false
      }
    }

    handleToken()
  }, [searchParams, pathname])

  if (!isLoading) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 10, 15, 0.95)',
        backdropFilter: 'blur(8px)',
        gap: 20,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      {/* Status */}
      {status === 'idle' && (
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'token-spin 1s linear infinite',
          }}
        />
      )}

      {status === 'success' && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'token-pop 0.3s ease-out',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {status === 'error' && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes token-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes token-pop {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
