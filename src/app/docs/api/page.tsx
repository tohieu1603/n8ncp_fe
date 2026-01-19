'use client'

import { useEffect, useRef } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export default function ApiDocsPage() {
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <SwaggerUI url={`${API_URL}/api-docs.json`} />
    </div>
  )
}
