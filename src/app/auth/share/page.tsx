'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { setAuthToken, getAuthToken, getMe } from '@/lib/api'

function ShareHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'receiving' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const redirectPath = searchParams.get('redirect') || '/'

    if (tokenParam) {
      // Receiving token from another domain
      handleReceiveToken(tokenParam, redirectPath)
    } else {
      // Generate share URL with current token
      const token = getAuthToken()
      if (token) {
        // Detect target domain
        const isLocalhost = window.location.hostname === 'localhost'
        const targetDomain = isLocalhost
          ? 'https://n8n.operis.vn'
          : 'http://localhost:3000'

        setShareUrl(`${targetDomain}/auth/share?token=${token}`)
      }
    }
  }, [searchParams])

  const handleReceiveToken = async (token: string, redirectPath: string = '/') => {
    setStatus('receiving')
    setMessage('Đang đồng bộ phiên đăng nhập...')

    try {
      setAuthToken(token)
      const user = await getMe()
      localStorage.setItem('user', JSON.stringify(user))

      setStatus('success')
      setMessage(`Đã đăng nhập với ${user.email}`)

      setTimeout(() => {
        router.replace(redirectPath)
      }, 1000)
    } catch {
      setStatus('error')
      setMessage('Token không hợp lệ hoặc đã hết hạn')
    }
  }

  const copyToClipboard = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openTargetDomain = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank')
    }
  }

  // Determine which domain we're sharing to
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const targetLabel = isLocalhost ? 'n8n.operis.vn' : 'localhost:3000'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 20,
      background: '#0a0a0f',
      padding: 24,
    }}>
      {/* Logo */}
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </div>

      <h1 style={{ color: '#f5f5f5', fontSize: 24, margin: 0, textAlign: 'center' }}>
        Chia sẻ phiên đăng nhập
      </h1>

      {/* Receiving token */}
      {status === 'receiving' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            margin: '0 auto 16px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#a0a0a8' }}>{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p style={{ color: '#22c55e', fontWeight: 500 }}>{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <p style={{ color: '#ef4444', fontWeight: 500 }}>{message}</p>
          <a
            href="/auth/login"
            style={{
              display: 'inline-block',
              marginTop: 16,
              padding: '12px 24px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Đăng nhập lại
          </a>
        </div>
      )}

      {/* Generate share link (idle state, no token param) */}
      {status === 'idle' && (
        <>
          {shareUrl ? (
            <div style={{ textAlign: 'center', maxWidth: 440 }}>
              <p style={{ color: '#a0a0a8', marginBottom: 16 }}>
                Mở link bên dưới trên <strong style={{ color: '#f5f5f5' }}>{targetLabel}</strong> để đồng bộ phiên đăng nhập:
              </p>

              {/* URL display */}
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 16,
                wordBreak: 'break-all',
                fontSize: 13,
                color: '#8b5cf6',
                fontFamily: 'monospace',
              }}>
                {shareUrl}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={openTargetDomain}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Mở {targetLabel}
                </button>

                <button
                  onClick={copyToClipboard}
                  style={{
                    padding: '14px 24px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: copied ? '#22c55e' : '#a0a0a8',
                    fontSize: 15,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Đã copy!
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy link
                    </>
                  )}
                </button>
              </div>

              <p style={{ color: '#6b6b75', fontSize: 13, marginTop: 20 }}>
                Link chỉ dùng 1 lần và có hiệu lực trong thời gian token còn hạn.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#a0a0a8', marginBottom: 24 }}>
                Bạn chưa đăng nhập. Vui lòng đăng nhập trước.
              </p>
              <a
                href="/auth/login"
                style={{
                  display: 'inline-block',
                  padding: '14px 32px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Đăng nhập
              </a>
            </div>
          )}
        </>
      )}

      {/* Back link */}
      {status === 'idle' && shareUrl && (
        <a
          href="/"
          style={{
            color: '#6b6b75',
            fontSize: 14,
            textDecoration: 'none',
            marginTop: 8,
          }}
        >
          ← Quay lại trang chủ
        </a>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    }>
      <ShareHandler />
    </Suspense>
  )
}
