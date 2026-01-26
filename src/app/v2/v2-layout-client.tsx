'use client'

import { useState, useEffect, useCallback, createContext, useContext, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Menu,
  Sparkles,
  Settings,
  LogOut,
  BarChart2,
  DollarSign,
  Trash2,
  Pencil,
  Check,
  X,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import {
  getConversations,
  createConversation,
  updateConversation,
  deleteConversation as deleteConversationApi,
  type Conversation,
} from '@/lib/api/conversations'

// Context for sharing conversation state with chat page
interface ConversationContextType {
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  refreshConversations: () => Promise<void>
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function useConversation() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error('useConversation must be used within V2LayoutClient')
  }
  return context
}

function V2LayoutClientInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Sync conversationId from URL on mount
  useEffect(() => {
    const convId = searchParams.get('c')
    if (convId && convId !== currentConversationId) {
      setCurrentConversationId(convId)
    }
  }, [searchParams, currentConversationId])

  // Update URL when conversation changes
  const updateConversationId = useCallback((id: string | null) => {
    setCurrentConversationId(id)
    if (id) {
      router.push(`/v2?c=${id}`, { scroll: false })
    } else {
      router.push('/v2', { scroll: false })
    }
  }, [router])

  const PAGE_SIZE = 10

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoadingConversations(true)
    try {
      const data = await getConversations(PAGE_SIZE, 0)
      setConversations(data)
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [isAuthenticated])

  const loadMoreConversations = useCallback(async () => {
    if (!isAuthenticated || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const data = await getConversations(PAGE_SIZE, conversations.length)
      setConversations(prev => [...prev, ...data])
      setHasMore(data.length >= PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load more conversations:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isAuthenticated, isLoadingMore, conversations.length])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const createNewSession = async () => {
    if (!isAuthenticated) return
    try {
      const newConv = await createConversation()
      setConversations([newConv, ...conversations])
      updateConversationId(newConv.id)
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const selectSession = (sessionId: string) => {
    updateConversationId(sessionId)
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteConversationApi(sessionId)
      setConversations(conversations.filter((c) => c.id !== sessionId))
      if (currentConversationId === sessionId) {
        updateConversationId(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const startEditingSession = (sessionId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(sessionId)
    setEditingTitle(currentTitle)
  }

  const saveSessionTitle = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editingTitle.trim()) {
      try {
        await updateConversation(sessionId, { title: editingTitle.trim() })
        setConversations(conversations.map(c =>
          c.id === sessionId ? { ...c, title: editingTitle.trim() } : c
        ))
      } catch (error) {
        console.error('Failed to update conversation:', error)
      }
    }
    setEditingSessionId(null)
    setEditingTitle('')
  }

  const cancelEditingSession = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSessionId(null)
    setEditingTitle('')
  }

  const conversationContextValue: ConversationContextType = {
    currentConversationId,
    setCurrentConversationId: updateConversationId,
    refreshConversations: loadConversations,
  }

  return (
    <ConversationContext.Provider value={conversationContextValue}>
    <div className="app-container">
      {/* Sidebar - wider for V2 */}
      <aside
        className={`sidebar ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}
        style={{ width: sidebarOpen ? 300 : 0, minWidth: sidebarOpen ? 300 : 0, maxWidth: sidebarOpen ? 300 : 0 }}
      >
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewSession}>
            <Plus size={18} />
            Cuộc hội thoại mới
          </button>
        </div>

        <div className="sidebar-content">
          {isLoadingConversations ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Chưa có lịch sử chat</p>
            </div>
          ) : (
            <>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                onClick={() => selectSession(conv.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingSessionId === conv.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveSessionTitle(conv.id, e as unknown as React.MouseEvent)
                        if (e.key === 'Escape') cancelEditingSession(e as unknown as React.MouseEvent)
                      }}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        fontSize: 13,
                        border: '1px solid var(--accent)',
                        borderRadius: 4,
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <>
                      <div className="history-item-title"><MessageCircle size={14} style={{ flexShrink: 0 }} /> {conv.title}</div>
                      <div className="history-item-date">{new Date(conv.createdAt).toLocaleDateString('vi-VN')}</div>
                    </>
                  )}
                </div>
                {editingSessionId === conv.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="history-delete-btn"
                      onClick={(e) => saveSessionTitle(conv.id, e)}
                      title="Lưu"
                      style={{ color: '#22c55e' }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="history-delete-btn"
                      onClick={cancelEditingSession}
                      title="Hủy"
                      style={{ color: '#ef4444' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="history-delete-btn"
                      onClick={(e) => startEditingSession(conv.id, conv.title, e)}
                      title="Đổi tên"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="history-delete-btn"
                      onClick={(e) => deleteSession(conv.id, e)}
                      title="Xoá"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {hasMore && (
              <button
                onClick={loadMoreConversations}
                disabled={isLoadingMore}
                style={{
                  width: '100%',
                  padding: '10px',
                  margin: '8px 0 4px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {isLoadingMore ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Xem thêm'
                )}
              </button>
            )}
            </>
          )}
        </div>

        {isAuthenticated && user && (
          <div className="sidebar-footer">
            {/* Token Balance */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Token</span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: (user.tokenBalance || 0) < 1000 ? '#ef4444' : (user.tokenBalance || 0) < 5000 ? '#f59e0b' : '#8b5cf6'
                }}>
                  {(user.tokenBalance || 0).toLocaleString()}
                </span>
              </div>
              {(user.tokenBalance || 0) < 5000 && (
                <a
                  href="/account/billing"
                  style={{
                    display: 'block',
                    marginTop: 8,
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'center',
                    borderRadius: 4,
                    textDecoration: 'none'
                  }}
                >
                  Nạp thêm token
                </a>
              )}
            </div>

            <div
              className="user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ position: 'relative' }}
            >
              <div className="user-avatar">{user.name?.[0] || user.email[0].toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{user.name || 'Người dùng'}</div>
                <div className="user-email">${Number(user.totalSpentUsd || 0).toFixed(4)} đã chi</div>
              </div>

              {showUserMenu && (
                <div className="dropdown-menu" style={{ bottom: 'calc(100% + 8px)' }}>
                  <div className="dropdown-item" style={{
                    background: (user.tokenBalance || 0) < 1000 ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                    color: (user.tokenBalance || 0) < 1000 ? '#ef4444' : 'inherit'
                  }}>
                    <BarChart2 size={16} />
                    {(user.tokenBalance || 0).toLocaleString()} token còn lại
                  </div>
                  <div className="dropdown-item">
                    <DollarSign size={16} />
                    ${Number(user.totalSpentUsd || 0).toFixed(4)} đã chi
                  </div>
                  <a href="/account/billing" className="dropdown-item" style={{ textDecoration: 'none', color: '#8b5cf6', fontWeight: 500 }}>
                    <Sparkles size={16} />
                    Nạp token
                  </a>
                  <a href="/account" className="dropdown-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Settings size={16} />
                    Cài đặt tài khoản
                  </a>
                  <div className="dropdown-item dropdown-item-danger" onClick={() => setShowLogoutConfirm(true)}>
                    <LogOut size={16} />
                    Đăng xuất
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Header */}
        <header className="main-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <a href="/v2" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} color="white" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Learn N8N</span>
            </a>
          </div>

          {!isAuthenticated && !authLoading && (
            <div style={{ display: 'flex', gap: 12, flexShrink: 0, alignItems: 'center' }}>
              <a
                href="/auth/login"
                style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                }}
              >
                Đăng nhập
              </a>
              <a
                href="/auth/register"
                style={{
                  textDecoration: 'none',
                  padding: '8px 20px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                Đăng ký
              </a>
            </div>
          )}
        </header>

        {/* Page Content */}
        {children}
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            style={{
              background: '#1a1a22',
              borderRadius: 12,
              padding: 24,
              maxWidth: 360,
              width: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#f5f5f5' }}>
              Xác nhận đăng xuất
            </h3>
            <p style={{ margin: '0 0 20px', color: '#a0a0a8', fontSize: 14 }}>
              Bạn có chắc chắn muốn đăng xuất?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#a0a0a8',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  logout()
                  setShowLogoutConfirm(false)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ConversationContext.Provider>
  )
}

export default function V2LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#8b5cf6' }} /></div>}>
      <V2LayoutClientInner>{children}</V2LayoutClientInner>
    </Suspense>
  )
}
