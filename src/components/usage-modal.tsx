'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Image as ImageIcon, LogIn, UserPlus, AlertCircle } from 'lucide-react'
import { getUsageSummary, getUsageLogs, UsageSummary, UsageLog } from '@/lib/api'

interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UsageModal({ isOpen, onClose }: UsageModalProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, page])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [summaryData, logsData] = await Promise.all([
        getUsageSummary(),
        getUsageLogs(page, 10),
      ])
      setSummary(summaryData)
      setLogs(logsData.logs)
      setTotalPages(logsData.totalPages)
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'generate_image':
        return <ImageIcon className="w-4 h-4" />
      case 'login':
        return <LogIn className="w-4 h-4" />
      case 'register':
        return <UserPlus className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'generate_image':
        return 'Image Generated'
      case 'login':
        return 'Logged In'
      case 'register':
        return 'Account Created'
      default:
        return action
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative glass rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Usage & History</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-white/50 mb-1">Images Generated</p>
                <p className="text-2xl font-bold text-white">{summary?.imageCount || 0}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-white/50 mb-1">Credits Used</p>
                <p className="text-2xl font-bold text-white">
                  {Number(summary?.creditsUsed || 0).toLocaleString()}
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-white/50 mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-white">
                  ${Number(summary?.totalSpentUsd || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Activity Log */}
            <div className="flex-1 overflow-auto">
              <h3 className="text-sm font-medium text-white/70 mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.success
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">
                        {getActionLabel(log.action)}
                      </p>
                      {log.metadata?.prompt && (
                        <p className="text-xs text-white/50 truncate">
                          {log.metadata.prompt}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {log.creditsUsed > 0 && (
                        <p className="text-sm text-white/70">
                          -{log.creditsUsed} credits
                        </p>
                      )}
                      <p className="text-xs text-white/40">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="text-center py-8 text-white/40">
                    No activity yet
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-white/50">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
