'use client'

import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token || processingRef.current) return

    // Mark as processing to prevent duplicate runs
    processingRef.current = true

    const handleToken = async () => {
      try {
        setAuthToken(token)
        const user = await getMe()
        localStorage.setItem('user', JSON.stringify(user))

        // Remove token from URL and redirect (no reload needed)
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        const cleanUrl = newUrl.pathname + (newUrl.search || '')

        // Use window.history to avoid triggering React re-renders
        window.history.replaceState({}, '', cleanUrl || pathname)

        // Dispatch custom event to notify auth context
        window.dispatchEvent(new Event('auth-updated'))
      } catch (err) {
        console.error('Invalid token:', err)
        // Token không hợp lệ, xóa khỏi URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        window.history.replaceState({}, '', newUrl.pathname + (newUrl.search || '') || pathname)
      } finally {
        processingRef.current = false
      }
    }

    handleToken()
  }, [searchParams, pathname])

  return null
}
