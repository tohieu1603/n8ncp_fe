'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { setAuthToken } from '@/lib/api'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      router.replace(`/?error=${error}`)
      return
    }

    if (token) {
      setAuthToken(token)
      router.replace('/')
    } else {
      router.replace('/')
    }
  }, [searchParams, router])

  return (
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
      <p style={{ color: 'var(--text-secondary)' }}>Đang đăng nhập...</p>
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
