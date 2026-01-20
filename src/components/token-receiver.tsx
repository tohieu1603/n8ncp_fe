'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { setAuthToken, getMe } from '@/lib/api'

/**
 * Component xử lý nhận token từ URL parameter
 * Cho phép login qua link: https://domain.com?token=xxx
 */
export function TokenReceiver() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) return

    const handleToken = async () => {
      try {
        setAuthToken(token)
        const user = await getMe()
        localStorage.setItem('user', JSON.stringify(user))

        // Remove token from URL (security)
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        router.replace(newUrl.pathname + newUrl.search || pathname)

        // Reload to update auth state
        window.location.reload()
      } catch (err) {
        console.error('Invalid token:', err)
        // Token không hợp lệ, xóa khỏi URL
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('token')
        router.replace(newUrl.pathname + newUrl.search || pathname)
      }
    }

    handleToken()
  }, [searchParams, router, pathname])

  return null
}
