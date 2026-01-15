'use client'

import { useState, useEffect } from 'react'
import {
  ScrollText,
  Image,
  MessageSquare,
  LogIn,
  LogOut,
  UserPlus,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
} from 'lucide-react'
import { getUsageLogs, UsageLog } from '@/lib/api'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  generate_image: <Image size={14} />,
  chat: <MessageSquare size={14} />,
  chat_stream: <MessageSquare size={14} />,
  login: <LogIn size={14} />,
  logout: <LogOut size={14} />,
  register: <UserPlus size={14} />,
  convert_word_to_pdf: <FileText size={14} />,
  convert_pdf_to_word: <FileText size={14} />,
  document_conversion: <FileText size={14} />,
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  generate_image: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  chat: { bg: 'bg-blue-100', text: 'text-blue-700' },
  chat_stream: { bg: 'bg-blue-100', text: 'text-blue-700' },
  login: { bg: 'bg-violet-100', text: 'text-violet-700' },
  logout: { bg: 'bg-red-100', text: 'text-red-700' },
  register: { bg: 'bg-amber-100', text: 'text-amber-700' },
  convert_word_to_pdf: { bg: 'bg-orange-100', text: 'text-orange-700' },
  convert_pdf_to_word: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  document_conversion: { bg: 'bg-teal-100', text: 'text-teal-700' },
}

export default function LogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadLogs()
  }, [page, filter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await getUsageLogs(page, 20)
      setLogs(filter === 'all' ? data.logs : data.logs.filter((l) => l.action === filter))
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f5f5]">Activity Logs</h1>
          <p className="text-[#a0a0a8] mt-1">View your recent API activity and usage history</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[#6b6b75]" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-[#111117] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f5f5f5] text-sm font-medium focus:outline-none focus:border-[#8b5cf6] transition-colors"
          >
            <option value="all">All Actions</option>
            <option value="generate_image">Image Generation</option>
            <option value="chat">Chat</option>
            <option value="chat_stream">Chat Stream</option>
            <option value="login">Login</option>
            <option value="register">Register</option>
            <option value="convert_word_to_pdf">Word to PDF</option>
            <option value="convert_pdf_to_word">PDF to Word</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#222230] border-t-[#8b5cf6] rounded-full animate-spin mb-4" />
          <p className="text-[#a0a0a8]">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)]">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-[#1a1a22] rounded-2xl">
            <ScrollText size={28} className="text-[#6b6b75]" />
          </div>
          <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">No Logs Found</h3>
          <p className="text-[#6b6b75]">Your activity logs will appear here</p>
        </div>
      ) : (
        <>
          {/* Logs Table */}
          <div className="bg-[#111117] rounded-2xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[160px_140px_1fr_100px_90px] gap-4 px-5 py-3 bg-[#0a0a0f] border-b border-[rgba(255,255,255,0.08)]">
              <span className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">Time</span>
              <span className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">Action</span>
              <span className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">Details</span>
              <span className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">Credits</span>
              <span className="text-xs font-semibold text-[#6b6b75] uppercase tracking-wide">Status</span>
            </div>

            {/* Table Rows */}
            {logs.map((log) => {
              const colors = ACTION_COLORS[log.action] || { bg: 'bg-[#1a1a22]', text: 'text-[#a0a0a8]' }
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-1 md:grid-cols-[160px_140px_1fr_100px_90px] gap-2 md:gap-4 px-5 py-4 border-b border-[rgba(255,255,255,0.05)] last:border-b-0 hover:bg-[#1a1a22] transition-colors"
                >
                  <span className="text-sm text-[#a0a0a8]">{formatDate(log.createdAt)}</span>
                  <span className="md:order-none order-first">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${colors.bg} ${colors.text} rounded-lg text-xs font-medium`}>
                      {ACTION_ICONS[log.action]}
                      {formatAction(log.action)}
                    </span>
                  </span>
                  <span className="text-sm text-[#a0a0a8] truncate">
                    {log.metadata?.prompt ? (
                      <span title={log.metadata.prompt}>
                        {log.metadata.prompt.substring(0, 50)}
                        {log.metadata.prompt.length > 50 ? '...' : ''}
                      </span>
                    ) : log.metadata?.agentId ? (
                      <span className="text-[#8b5cf6]">Agent: {log.metadata.agentId}</span>
                    ) : log.metadata?.error ? (
                      <span className="text-red-400">{log.metadata.error}</span>
                    ) : log.metadata?.fileName ? (
                      <span>{log.metadata.fileName}</span>
                    ) : (
                      <span className="text-[#6b6b75]">-</span>
                    )}
                  </span>
                  <span className="text-sm">
                    {Number(log.creditsUsed) > 0 ? (
                      <span>
                        <span className="font-semibold text-[#f5f5f5]">{log.creditsUsed}</span>
                        <span className="block text-xs text-[#6b6b75]">${Number(log.costUsd).toFixed(4)}</span>
                      </span>
                    ) : (
                      <span className="text-[#6b6b75]">-</span>
                    )}
                  </span>
                  <span>
                    {log.success ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                        <CheckCircle size={14} />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                        <XCircle size={14} />
                        Failed
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a22] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-medium text-[#a0a0a8] hover:bg-[#222230] hover:text-[#f5f5f5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <span className="text-sm text-[#a0a0a8]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a22] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-medium text-[#a0a0a8] hover:bg-[#222230] hover:text-[#f5f5f5] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
