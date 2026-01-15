'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Zap, Image, MessageSquare, DollarSign } from 'lucide-react'
import { getUsageStats, UsageStats } from '@/lib/api'

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')

  useEffect(() => {
    loadStats()
  }, [period])

  const loadStats = async () => {
    setLoading(true)
    try {
      const data = await getUsageStats(period)
      setStats(data)
    } catch (error) {
      console.error('Failed to load usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">API Usage</h1>
          <p className="text-[#a0a0a8] mt-1">Monitor your API usage and resource consumption</p>
        </div>
        <div className="flex p-1 bg-[#1a1a22] rounded-xl">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                period === p
                  ? 'bg-[#222230] text-[#f5f5f5] shadow-sm'
                  : 'text-[#a0a0a8] hover:text-[#f5f5f5]'
              }`}
            >
              {p === 'day' ? 'Today' : p === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin mb-4" />
          <p className="text-[#a0a0a8]">Loading stats...</p>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-5 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(139,92,246,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(139,92,246,0.15)] rounded-xl">
                  <Zap size={20} className="text-[#8b5cf6]" />
                </div>
              </div>
              <p className="text-sm text-[#a0a0a8] mb-1">Total Credits</p>
              <p className="text-2xl font-bold text-[#f5f5f5]">{formatNumber(stats.totalCredits)}</p>
            </div>

            <div className="p-5 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(59,130,246,0.15)] rounded-xl">
                  <TrendingUp size={20} className="text-blue-400" />
                </div>
              </div>
              <p className="text-sm text-[#a0a0a8] mb-1">Total Tokens</p>
              <p className="text-2xl font-bold text-[#f5f5f5]">{formatNumber(stats.totalTokens)}</p>
            </div>

            <div className="p-5 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(16,185,129,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(16,185,129,0.15)] rounded-xl">
                  <Image size={20} className="text-emerald-400" />
                </div>
              </div>
              <p className="text-sm text-[#a0a0a8] mb-1">Images Generated</p>
              <p className="text-2xl font-bold text-[#f5f5f5]">{stats.imageCount}</p>
            </div>

            <div className="p-5 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(245,158,11,0.3)] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(245,158,11,0.15)] rounded-xl">
                  <MessageSquare size={20} className="text-amber-400" />
                </div>
              </div>
              <p className="text-sm text-[#a0a0a8] mb-1">Chat Messages</p>
              <p className="text-2xl font-bold text-[#f5f5f5]">{stats.chatCount}</p>
            </div>
          </div>

          {/* Usage Chart */}
          <div className="p-6 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] mb-8">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={20} className="text-[#f5f5f5]" />
              <h2 className="text-lg font-bold text-[#f5f5f5]">Usage Over Time</h2>
            </div>
            <div className="h-48">
              <div className="flex items-end justify-between h-full gap-2">
                {stats.dailyUsage.map((day, i) => {
                  const maxCredits = Math.max(...stats.dailyUsage.map((d) => d.credits), 1)
                  const heightPercent = Math.max(5, (day.credits / maxCredits) * 100)
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center h-full">
                      <div className="flex-1 flex items-end w-full">
                        <div
                          className="w-full bg-gradient-to-t from-[#8b5cf6] to-[#6366f1] rounded-t-lg transition-all duration-300 hover:from-[#a78bfa] hover:to-[#818cf8] relative group"
                          style={{ height: `${heightPercent}%` }}
                        >
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-[#f5f5f5] opacity-0 group-hover:opacity-100 transition-opacity">
                            {day.credits}
                          </span>
                        </div>
                      </div>
                      <span className="mt-2 text-xs text-[#6b6b75]">{day.date}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Usage by Type */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(16,185,129,0.15)] rounded-xl">
                  <Image size={18} className="text-emerald-400" />
                </div>
                <h3 className="font-bold text-[#f5f5f5]">Image Generation</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Count</span>
                  <span className="font-semibold text-[#f5f5f5]">{stats.imageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Credits</span>
                  <span className="font-semibold text-[#f5f5f5]">{stats.imageCredits}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Cost</span>
                  <span className="font-semibold text-[#f5f5f5]">${stats.imageCost.toFixed(4)}</span>
                </div>
              </div>
              <div className="h-2 bg-[#1a1a22] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.imageCredits / (stats.totalCredits || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-6 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center bg-[rgba(59,130,246,0.15)] rounded-xl">
                  <MessageSquare size={18} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-[#f5f5f5]">Chat API</h3>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Messages</span>
                  <span className="font-semibold text-[#f5f5f5]">{stats.chatCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Tokens</span>
                  <span className="font-semibold text-[#f5f5f5]">{formatNumber(stats.chatTokens)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#a0a0a8]">Cost</span>
                  <span className="font-semibold text-[#f5f5f5]">${stats.chatCost.toFixed(4)}</span>
                </div>
              </div>
              <div className="h-2 bg-[#1a1a22] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (stats.chatCredits / (stats.totalCredits || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cost Summary */}
          <div className="p-6 bg-[#0a0a0f] rounded-2xl border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 flex items-center justify-center bg-[rgba(139,92,246,0.15)] rounded-xl">
                <DollarSign size={20} className="text-[#8b5cf6]" />
              </div>
              <h2 className="text-lg font-bold text-[#f5f5f5]">Cost Summary</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#111117] rounded-xl">
                <p className="text-sm text-[#6b6b75] mb-1">Image Generation</p>
                <p className="text-xl font-bold text-[#f5f5f5]">${stats.imageCost.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-[#111117] rounded-xl">
                <p className="text-sm text-[#6b6b75] mb-1">Chat API</p>
                <p className="text-xl font-bold text-[#f5f5f5]">${stats.chatCost.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-[rgba(139,92,246,0.1)] rounded-xl border border-[rgba(139,92,246,0.3)]">
                <p className="text-sm text-[#8b5cf6] mb-1">Total</p>
                <p className="text-xl font-bold text-[#f5f5f5]">${(stats.imageCost + stats.chatCost).toFixed(4)}</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
          <p className="text-[#6b6b75]">No usage data available</p>
        </div>
      )}
    </div>
  )
}
