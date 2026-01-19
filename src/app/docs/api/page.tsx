'use client'

import { useState, useEffect } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  const [specUrl, setSpecUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Try to find the correct API docs URL
    const tryUrls = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
      const possibleUrls = [
        `${apiUrl}/api-docs.json`,
        '/api-docs.json',
        `${window.location.origin}/api-docs.json`,
      ].filter(url => url && !url.startsWith('/api-docs'))

      for (const url of possibleUrls) {
        try {
          const res = await fetch(url, { method: 'HEAD' })
          if (res.ok) {
            setSpecUrl(url)
            return
          }
        } catch {
          // Try next URL
        }
      }

      // Default to API URL
      setSpecUrl(`${apiUrl}/api-docs.json`)
      setError('Could not connect to API documentation. Make sure backend is deployed with Swagger enabled.')
    }

    tryUrls()
  }, [])

  if (!specUrl) {
    return (
      <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Loading API Documentation...</p>
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 24px', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <SwaggerUI url={specUrl} />
    </div>
  )
}
