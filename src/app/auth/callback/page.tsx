'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAuthToken, getMe } from '@/lib/api'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setErrorMsg(error === 'google_auth_failed' ? 'Đăng nhập Google thất bại' : error)
        setTimeout(() => router.replace('/auth/login'), 2000)
        return
      }

      if (token) {
        try {
          // Save token first
          setAuthToken(token)

          // Fetch user data to save to localStorage
          const user = await getMe()
          localStorage.setItem('user', JSON.stringify(user))

          setStatus('success')

          // Redirect based on role
          setTimeout(() => {
            if ((user as any).role === 'admin') {
              router.replace('/admin')
            } else {
              router.replace('/')
            }
          }, 500)
        } catch (err) {
          setStatus('error')
          setErrorMsg('Không thể lấy thông tin người dùng')
          setTimeout(() => router.replace('/auth/login'), 2000)
        }
      } else {
        router.replace('/auth/login')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 16,
      background: '#0a0a0f',
    }}>
      {status === 'loading' && (
        <>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#a0a0a8' }}>Đang đăng nhập...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <p style={{ color: '#22c55e', fontWeight: 500 }}>Đăng nhập thành công!</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <p style={{ color: '#ef4444', fontWeight: 500 }}>{errorMsg}</p>
          <p style={{ color: '#6b6b75', fontSize: 14 }}>Đang chuyển hướng...</p>
        </>
      )}
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 16,
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid var(--border-color)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
