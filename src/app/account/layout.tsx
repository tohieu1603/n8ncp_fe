'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Key,
  CreditCard,
  BarChart3,
  ScrollText,
  Cpu,
  Settings,
  ChevronLeft,
  Crown,
  Sparkles,
  Book,
} from 'lucide-react'
import { getAuthToken } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

const menuItems = [
  { id: 'api-keys', label: 'API Keys', icon: Key, href: '/account/api-keys' },
  { id: 'docs', label: 'Documentation', icon: Book, href: '/account/docs' },
  { id: 'billing', label: 'Billing', icon: CreditCard, href: '/account/billing' },
  { id: 'usage', label: 'API Usage', icon: BarChart3, href: '/account/usage' },
  { id: 'logs', label: 'Logs', icon: ScrollText, href: '/account/logs' },
  { id: 'models', label: 'Models', icon: Cpu, href: '/account/models' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/account/settings' },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      router.push('/')
      return
    }
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 min-w-[256px] bg-[#111117] border-r border-[rgba(255,255,255,0.08)] h-screen sticky top-0">
        {/* Back button */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#a0a0a8] hover:text-[#f5f5f5] transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} />
            Back to App
          </Link>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f5f5f5] truncate">
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-[#6b6b75] truncate">{user?.email}</p>
            </div>
            {user?.isPro && (
              <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                <Crown size={10} />
                PRO
              </span>
            )}
          </div>
        </div>

        {/* Credits Card */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.08)]">
          <div className="p-4 bg-gradient-to-br from-[#8b5cf6] to-indigo-600 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-purple-200" />
              <span className="text-xs font-medium text-purple-200">Credits Used</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {Number(user?.creditsUsed || 0).toLocaleString()}
            </p>
            <p className="text-xs text-purple-200 mt-1">
              ${Number(user?.totalSpentUsd || 0).toFixed(4)} spent
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[rgba(139,92,246,0.15)] text-[#a78bfa]'
                    : 'text-[#a0a0a8] hover:bg-[#1a1a22] hover:text-[#f5f5f5]'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-[#111117] border-b border-[rgba(255,255,255,0.08)] flex items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-[#a0a0a8] hover:text-[#f5f5f5] transition-colors text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Back
        </Link>
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-[#f5f5f5]">Account</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111117] border-t border-[rgba(255,255,255,0.08)] px-2 py-2">
        <div className="flex justify-around">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-[#8b5cf6]' : 'text-[#6b6b75]'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <main className="flex-1 min-h-screen lg:h-screen lg:overflow-y-auto pt-14 pb-20 lg:pt-0 lg:pb-0">
        <div className="max-w-5xl mx-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
