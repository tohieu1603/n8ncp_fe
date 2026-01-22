'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Menu,
  Send,
  Download,
  LogOut,
  BarChart2,
  Sparkles,
  X,
  Upload,
  Loader2,
  DollarSign,
  Trash2,
  Play,
  ExternalLink,
  Copy,
  Check,
  Settings,
  MessageCircle,
  Pencil,
} from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import {
  streamChat,
  createWorkflow,
  hasEnoughTokens,
  getRemainingTokens,
  InsufficientTokensError,
  getDownloadUrl,
} from '@/lib/api'
import {
  getConversations,
  createConversation,
  getConversation as getConversationApi,
  updateConversation,
  deleteConversation as deleteConversationApi,
  type Conversation,
  type ConversationMessage,
} from '@/lib/api/conversations'

// Parse n8n-workflow code blocks from message content
function parseWorkflowFromContent(content: string): { text: string; workflow: object | null } {
  const workflowRegex = /```n8n-workflow\s*([\s\S]*?)```/g
  const match = workflowRegex.exec(content)

  if (match) {
    try {
      const workflow = JSON.parse(match[1].trim())
      const text = content.replace(workflowRegex, '').trim()
      return { text, workflow }
    } catch {
      return { text: content, workflow: null }
    }
  }

  return { text: content, workflow: null }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  isLoading?: boolean
  error?: string
  usage?: { tokens: number; cost: number }
  workflow?: object | null
  workflowUrl?: string
}

const SUGGESTIONS = [
  { title: 'n8n là gì?', desc: 'Giới thiệu về n8n workflow automation' },
  { title: 'Tạo workflow gửi email', desc: 'Workflow tự động gửi email khi có trigger' },
  { title: 'Kết nối Google Sheets', desc: 'Đọc/ghi dữ liệu từ Google Sheets' },
  { title: 'Webhook + Slack', desc: 'Nhận webhook và gửi thông báo Slack' },
]

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading, logout, refreshUser } = useAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [copiedWorkflow, setCopiedWorkflow] = useState<string | null>(null)
  const [creatingWorkflow, setCreatingWorkflow] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

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
      router.push(`/?c=${id}`, { scroll: false })
    } else {
      router.push('/', { scroll: false })
    }
  }, [router])

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoadingConversations(true)
    try {
      const data = await getConversations(1, 50)
      setConversations(data.conversations)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversationId || !isAuthenticated) {
        setMessages([])
        return
      }
      try {
        const conv = await getConversationApi(currentConversationId)
        const loadedMessages: Message[] = conv.messages.map((m: ConversationMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          usage: m.tokensUsed ? { tokens: m.tokensUsed, cost: 0 } : undefined,
        }))
        setMessages(loadedMessages)
      } catch (error) {
        console.error('Failed to load conversation:', error)
        setMessages([])
      }
    }
    loadMessages()
  }, [currentConversationId, isAuthenticated])

  const createNewSession = async () => {
    if (!isAuthenticated) return
    try {
      const newConv = await createConversation()
      setConversations([newConv, ...conversations])
      updateConversationId(newConv.id)
      setMessages([])
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const selectSession = (convId: string) => {
    updateConversationId(convId)
  }

  const deleteSession = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteConversationApi(convId)
      setConversations(conversations.filter((c) => c.id !== convId))
      if (currentConversationId === convId) {
        updateConversationId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const startEditingConversation = (convId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingConversationId(convId)
    setEditingTitle(currentTitle)
  }

  const saveConversationTitle = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (editingTitle.trim()) {
      try {
        await updateConversation(convId, { title: editingTitle.trim() })
        setConversations(conversations.map(c =>
          c.id === convId ? { ...c, title: editingTitle.trim() } : c
        ))
      } catch (error) {
        console.error('Failed to update conversation:', error)
      }
    }
    setEditingConversationId(null)
    setEditingTitle('')
  }

  const cancelEditingConversation = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingConversationId(null)
    setEditingTitle('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: string[] = []
    for (let i = 0; i < Math.min(files.length, 4 - uploadedImages.length); i++) {
      const file = files[i]
      if (file.size > 30 * 1024 * 1024) continue
      const base64 = await fileToBase64(file)
      newImages.push(base64)
    }
    setUploadedImages([...uploadedImages, ...newImages])
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!prompt.trim() || !isAuthenticated) return

    // Validate token
    const estimatedTokens = 1000
    if (!hasEnoughTokens(user, estimatedTokens)) {
      const remaining = getRemainingTokens(user)
      alert(`Không đủ token! Còn lại: ${remaining.toLocaleString()} token.\nVui lòng nạp thêm để tiếp tục sử dụng.`)
      window.location.href = '/account/billing'
      return
    }

    await handleChatMessage()
  }

  const handleCreateWorkflow = async (workflow: object, messageId: string) => {
    setCreatingWorkflow(messageId)
    try {
      const result = await createWorkflow(workflow)
      if (result && result.success && result.workflowUrl) {
        // Update message with workflow URL
        updateAssistantMessage(messageId, { workflowUrl: result.workflowUrl })
        // Open workflow in new tab (iframe blocked by n8n X-Frame-Options)
        window.open(result.workflowUrl, '_blank')
      } else {
        const errorMsg = result?.error || 'Không thể tạo workflow. Kiểm tra kết nối n8n.'
        alert(errorMsg)
      }
    } catch (error) {
      console.error('Create workflow error:', error)
      alert(error instanceof Error ? error.message : 'Lỗi khi tạo workflow')
    } finally {
      setCreatingWorkflow(null)
    }
  }

  const handleCopyWorkflow = (workflow: object, messageId: string) => {
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2))
    setCopiedWorkflow(messageId)
    setTimeout(() => setCopiedWorkflow(null), 2000)
  }

  const handleChatMessage = async () => {
    // Auto-create conversation if none selected
    let convId = currentConversationId
    if (!convId) {
      try {
        const newConv = await createConversation(prompt.slice(0, 30))
        setConversations([newConv, ...conversations])
        convId = newConv.id
        updateConversationId(convId)
      } catch (error) {
        console.error('Failed to create conversation:', error)
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      isLoading: true,
    }

    const newMessages = [...messages, userMessage, loadingMessage]
    setMessages(newMessages)
    setPrompt('')

    try {
      let fullContent = ''
      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }))
      chatHistory.push({ role: 'user', content: prompt })

      // Use image URL if uploaded
      const imageUrl = uploadedImages.length > 0 ? uploadedImages[0] : undefined

      for await (const chunk of streamChat(chatHistory, imageUrl, convId || undefined)) {
        if (chunk.content) {
          fullContent += chunk.content
          // Parse workflow while streaming
          const { text, workflow } = parseWorkflowFromContent(fullContent)
          updateAssistantMessage(loadingMessage.id, {
            content: text,
            workflow,
            isLoading: true,
          })
        }
        if (chunk.done) {
          // Final parse
          const { text, workflow } = parseWorkflowFromContent(fullContent)
          updateAssistantMessage(loadingMessage.id, {
            content: text,
            workflow,
            isLoading: false,
            usage: chunk.usage ? { tokens: chunk.usage.estimatedTokens, cost: chunk.usage.cost } : undefined,
          })
          refreshUser()
        }
      }

      // Clear uploaded images after sending
      setUploadedImages([])
    } catch (error) {
      if (error instanceof InsufficientTokensError) {
        updateAssistantMessage(loadingMessage.id, {
          isLoading: false,
          error: 'Hết token',
          content: 'Bạn đã hết token! Vui lòng nạp thêm để tiếp tục sử dụng.',
        })
        setTimeout(() => {
          window.location.href = '/account/billing'
        }, 2000)
        return
      }

      updateAssistantMessage(loadingMessage.id, {
        isLoading: false,
        error: error instanceof Error ? error.message : 'Chat failed',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
      })
    }
  }

  const updateAssistantMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m)))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDownload = async (imageUrl: string) => {
    const downloadUrl = getDownloadUrl(imageUrl)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `generated-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSuggestionClick = (suggestion: typeof SUGGESTIONS[0]) => {
    setPrompt(suggestion.title)
    textareaRef.current?.focus()
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewSession}>
            <Plus size={18} />
            New chat
          </button>
        </div>

        <div className="sidebar-content">
          {isLoadingConversations ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No history yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                onClick={() => selectSession(conv.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingConversationId === conv.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveConversationTitle(conv.id, e as unknown as React.MouseEvent)
                        if (e.key === 'Escape') cancelEditingConversation(e as unknown as React.MouseEvent)
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
                      <div className="history-item-title">
                        <MessageCircle size={14} style={{ flexShrink: 0 }} /> {conv.title}
                      </div>
                      <div className="history-item-date">{new Date(conv.createdAt).toLocaleDateString('vi-VN')}</div>
                    </>
                  )}
                </div>
                {editingConversationId === conv.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="history-delete-btn"
                      onClick={(e) => saveConversationTitle(conv.id, e)}
                      title="Lưu"
                      style={{ color: '#22c55e' }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="history-delete-btn"
                      onClick={cancelEditingConversation}
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
                      onClick={(e) => startEditingConversation(conv.id, conv.title, e)}
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
            ))
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
                <div className="user-name">{user.name || 'User'}</div>
                <div className="user-email">${Number(user.totalSpentUsd || 0).toFixed(4)} spent</div>
              </div>

              {showUserMenu && (
                <div className="dropdown-menu bottom-[calc(100%+8px)]">
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
        <header className="main-header" style={{ overflow: 'visible' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={16} color="white" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 16 }}>N8N Teacher</span>
            </div>
          </div>

          {!isAuthenticated && !authLoading && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <a
                href="/auth/login"
                style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  color: 'var(--text-secondary)',
                  borderRadius: 8,
                  transition: 'color 0.15s'
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
                  fontWeight: 500
                }}
              >
                Đăng ký
              </a>
            </div>
          )}
        </header>

        {/* Chat Area */}
        <div className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">Xin chào! Tôi là N8N Teacher</h1>
              <p className="welcome-subtitle">
                Tôi sẽ giúp bạn học n8n workflow automation. Hỏi bất cứ điều gì về n8n!
              </p>

              <div className="suggestions">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="suggestion-card"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-title">
                      🔧 {suggestion.title}
                    </div>
                    <div className="suggestion-desc">{suggestion.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.role === 'user' ? 'message-user' : 'message-ai'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="message-avatar" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
                      <Play size={16} color="white" />
                    </div>
                  )}

                  <div className="message-content">
                    {message.isLoading && !message.content ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 0'
                      }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          animation: 'pulse 2s ease-in-out infinite'
                        }}>
                          <Sparkles size={16} color="white" />
                        </div>
                        <div>
                          <div style={{
                            fontWeight: 500,
                            fontSize: 14,
                            color: 'var(--text-primary)',
                            marginBottom: 4
                          }}>
                            Đang suy nghĩ...
                          </div>
                          <div className="thinking-dots" style={{
                            display: 'flex',
                            gap: 4
                          }}>
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                            <div className="thinking-dot" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>

                        {/* Workflow Display */}
                        {message.workflow && !message.isLoading && (
                          <div style={{
                            marginTop: 16,
                            padding: 16,
                            background: 'rgba(255, 107, 53, 0.1)',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 107, 53, 0.3)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <Play size={18} color="#ff6b35" />
                              <span style={{ fontWeight: 600, color: '#ff6b35' }}>n8n Workflow</span>
                            </div>

                            {/* Workflow Actions */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {!message.workflowUrl ? (
                                <button
                                  onClick={() => handleCreateWorkflow(message.workflow!, message.id)}
                                  disabled={creatingWorkflow === message.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 16px',
                                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: creatingWorkflow === message.id ? 'wait' : 'pointer',
                                    fontWeight: 500,
                                    fontSize: 13,
                                  }}
                                >
                                  {creatingWorkflow === message.id ? (
                                    <>
                                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                      Đang tạo...
                                    </>
                                  ) : (
                                    <>
                                      <Play size={14} />
                                      Tạo Workflow
                                    </>
                                  )}
                                </button>
                              ) : (
                                <a
                                  href={message.workflowUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 16px',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 8,
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    fontSize: 13,
                                  }}
                                >
                                  <ExternalLink size={14} />
                                  Mở trong n8n
                                </a>
                              )}

                              <button
                                onClick={() => handleCopyWorkflow(message.workflow!, message.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 16px',
                                  background: 'transparent',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  fontSize: 13,
                                }}
                              >
                                {copiedWorkflow === message.id ? (
                                  <>
                                    <Check size={14} color="#22c55e" />
                                    Đã copy!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} />
                                    Copy JSON
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {message.usage && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                            <span>{message.usage.tokens} tokens</span>
                            <span>•</span>
                            <span>${message.usage.cost.toFixed(4)}</span>
                          </div>
                        )}
                        {message.imageUrl && (
                          <div className="generated-image-container">
                            <Image
                              src={message.imageUrl}
                              alt="Generated"
                              width={512}
                              height={512}
                              className="generated-image"
                              unoptimized
                            />
                            <div className="image-actions">
                              <button
                                className="image-action-btn"
                                onClick={() => handleDownload(message.imageUrl!)}
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        )}
                        {message.error && (
                          <div style={{ color: '#ef4444', marginTop: 8, fontSize: 13 }}>
                            {message.error}
                          </div>
                        )}
                        {message.isLoading && message.content && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 12,
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(247, 147, 30, 0.15) 100%)',
                            border: '1px solid rgba(255, 107, 53, 0.3)',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            color: '#ff6b35'
                          }}>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            Đang xử lý...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area">
          <div className="input-container" style={{ position: 'relative' }}>
            <div className="input-wrapper" style={{ overflow: 'visible' }}>
              {/* Upload Preview */}
              {uploadedImages.length > 0 && (
                <div className="upload-preview">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="upload-thumb">
                      <img src={img} alt={`Upload ${idx + 1}`} />
                      <button className="upload-thumb-remove" onClick={() => removeImage(idx)}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Options Row */}
              <div className="options-row" style={{ overflow: 'visible' }}>
                <button className="option-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} />
                  Thêm ảnh
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </div>

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                className="prompt-input"
                placeholder={
                  isAuthenticated
                    ? 'Hỏi về n8n workflow automation...'
                    : 'Đăng nhập để bắt đầu...'
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={() => !isAuthenticated && (window.location.href = '/auth/login')}
                rows={1}
              />

              {/* Send Button */}
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!prompt.trim() || !isAuthenticated}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
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
  )
}
