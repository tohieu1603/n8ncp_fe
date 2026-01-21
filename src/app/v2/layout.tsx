import type { Metadata } from 'next'
import V2LayoutClient from './v2-layout-client'

export const metadata: Metadata = {
  title: {
    absolute: 'Learn N8N - Học tự động hóa workflow',
  },
  description: 'Nền tảng học N8N với AI Agent hỗ trợ',
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <V2LayoutClient>{children}</V2LayoutClient>
}
