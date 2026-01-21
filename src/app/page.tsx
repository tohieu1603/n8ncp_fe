'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Menu,
  Send,
  Download,
  Settings,
  LogOut,
  BarChart2,
  Sparkles,
  X,
  Upload,
  ChevronDown,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Code,
  Pencil,
  Loader2,
  DollarSign,
  Crown,
  Scale,
  Trash2,
  Check,
  MessageCircle,
} from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'
import {
  generateImage,
  getTaskStatus,
  getDownloadUrl,
  streamChat,
  Agent,
  hasEnoughTokens,
  getRemainingTokens,
  InsufficientTokensError,
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
import DocumentConverter from '@/components/document-converter'

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
type Resolution = '1K' | '2K' | '4K'
type Mode = 'image' | 'chat' | 'convert' | 'legal'

// Image model configurations
interface ImageModel {
  id: string
  name: string
  description: string
  tier: 'base' | 'pro'
  speed: 'fast' | 'medium' | 'slow'
  quality: 'standard' | 'high' | 'ultra'
}

const IMAGE_MODELS: ImageModel[] = [
  // Base models
  { id: 'flux-schnell', name: 'Flux Schnell', description: 'Fast generation, good quality', tier: 'base', speed: 'fast', quality: 'standard' },
  { id: 'flux-dev', name: 'Flux Dev', description: 'Balanced speed & quality', tier: 'base', speed: 'medium', quality: 'high' },
  // Pro models - Full Gemini 3 experience
  { id: 'flux-pro', name: 'Flux Pro', description: 'Premium quality, best details', tier: 'pro', speed: 'medium', quality: 'ultra' },
  { id: 'gemini-imagen-3', name: 'Gemini Imagen 3', description: 'Google AI - photorealistic results', tier: 'pro', speed: 'slow', quality: 'ultra' },
  { id: 'gemini-imagen-3-fast', name: 'Gemini Imagen 3 Fast', description: 'Google AI - faster generation', tier: 'pro', speed: 'fast', quality: 'high' },
]

// Agent configurations with tiers
// NOTE: Backend cần implement system prompt riêng cho mỗi agent để giới hạn lĩnh vực chuyên môn
const AGENTS: Agent[] = [
  // General - Trợ lý đa năng, trả lời mọi câu hỏi
  { id: 'general_base', name: 'General', icon: 'MessageSquare', description: 'Trợ lý đa năng • Trả lời mọi câu hỏi • Giới hạn 4K token', tier: 'base', category: 'general' },
  { id: 'general_pro', name: 'General Pro', icon: 'MessageSquare', description: 'Trợ lý đa năng • Context 32K • Suy luận & phân tích chuyên sâu', tier: 'pro', category: 'general' },
  // Image - CHỈ hỗ trợ về hình ảnh, prompt, thiết kế
  { id: 'image_base', name: 'Image', icon: 'Image', description: 'Chuyên gia hình ảnh • Phân tích ảnh • Gợi ý prompt AI', tier: 'base', category: 'image' },
  { id: 'image_pro', name: 'Image Pro', icon: 'Image', description: 'Chuyên gia hình ảnh • Phân tích đa ảnh • Prompt Midjourney/DALL-E', tier: 'pro', category: 'image' },
  // Document - CHỈ xử lý tài liệu, văn bản
  { id: 'document_base', name: 'Document', icon: 'FileText', description: 'Chuyên gia tài liệu • Tóm tắt • Trích xuất thông tin', tier: 'base', category: 'document' },
  { id: 'document_pro', name: 'Document Pro', icon: 'FileText', description: 'Chuyên gia tài liệu • Phân tích sâu • So sánh & báo cáo', tier: 'pro', category: 'document' },
  // Code - CHỈ hỗ trợ lập trình
  { id: 'code_base', name: 'Code', icon: 'Code', description: 'Chuyên gia code • Debug • Giải thích code', tier: 'base', category: 'code' },
  { id: 'code_pro', name: 'Code Pro', icon: 'Code', description: 'Chuyên gia code • Kiến trúc full-stack • Review & tối ưu', tier: 'pro', category: 'code' },
  // Creative - CHỈ sáng tạo nội dung
  { id: 'creative_base', name: 'Creative', icon: 'Pencil', description: 'Chuyên gia sáng tạo • Viết content • Ý tưởng marketing', tier: 'base', category: 'creative' },
  { id: 'creative_pro', name: 'Creative Pro', icon: 'Pencil', description: 'Chuyên gia sáng tạo • Copywriting • Kịch bản & SEO', tier: 'pro', category: 'creative' },
  // Legal & Finance - CHỈ về pháp lý, tài chính
  { id: 'legal_base', name: 'Văn bản', icon: 'Scale', description: 'Chuyên gia văn bản • Đọc & sửa • Tóm tắt pháp lý', tier: 'base', category: 'legal' },
  { id: 'legal_pro', name: 'Văn bản Pro', icon: 'Scale', description: 'Chuyên gia văn bản • Tư vấn pháp lý & tài chính • Soạn hợp đồng', tier: 'pro', category: 'legal' },
]

// Group agents by category
const AGENT_CATEGORIES = ['general', 'image', 'document', 'code', 'creative', 'legal']

const AGENT_ICONS: Record<string, typeof MessageSquare> = {
  MessageSquare,
  Image: ImageIcon,
  FileText,
  Code,
  Pencil,
  Scale,
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
  isLoading?: boolean
  error?: string
  usage?: { tokens: number; cost: number }
  settings?: { aspectRatio: AspectRatio; resolution: Resolution; model?: string }
}

// ChatSession is now fetched from API as Conversation

const SUGGESTIONS = [
  { title: 'Sunset landscape', desc: 'Golden hour mountain scene', mode: 'image' as Mode },
  { title: 'Analyze this code', desc: 'Help me understand a function', mode: 'chat' as Mode },
  { title: 'Cyberpunk city', desc: 'Neon-lit futuristic streets', mode: 'image' as Mode },
  { title: 'Summarize document', desc: 'Extract key points', mode: 'chat' as Mode },
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
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [resolution, setResolution] = useState<Resolution>('1K')
  const [showSettings, setShowSettings] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showLegalMenu, setShowLegalMenu] = useState(false)
  const [mode, setMode] = useState<Mode>('chat')
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0])
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>(IMAGE_MODELS[0])
  const [selectedLegalAgent, setSelectedLegalAgent] = useState<Agent>(AGENTS.find(a => a.id === 'legal_base')!)
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
        // Set agent from conversation
        const agent = AGENTS.find((a) => a.id === conv.agentId)
        if (agent) setSelectedAgent(agent)
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

    // Validate token trước khi gửi request
    // Ước tính token cần: chat ~1000, image ~5000
    const estimatedTokens = mode === 'image' ? 5000 : 1000

    if (!hasEnoughTokens(user, estimatedTokens)) {
      const remaining = getRemainingTokens(user)
      alert(`Không đủ token! Còn lại: ${remaining.toLocaleString()} token.\nVui lòng nạp thêm để tiếp tục sử dụng.`)
      window.location.href = '/account/billing'
      return
    }

    if (mode === 'image') {
      await handleImageGeneration()
    } else if (mode === 'chat' || mode === 'legal') {
      await handleChatMessage()
    }
  }

  const handleImageGeneration = async () => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      settings: { aspectRatio, resolution, model: selectedImageModel.name },
    }

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Generating your image...',
      isLoading: true,
    }

    const newMessages = [...messages, userMessage, loadingMessage]
    setMessages(newMessages)
    setPrompt('')
    setUploadedImages([])

    try {
      const response = await generateImage({
        prompt,
        image_input: uploadedImages,
        aspect_ratio: aspectRatio,
        resolution,
        output_format: 'png',
        model: selectedImageModel.id,
      })

      const pollResult = async (taskId: string, attempts = 0): Promise<void> => {
        if (attempts >= 60) {
          updateAssistantMessage(loadingMessage.id, {
            isLoading: false,
            error: 'Generation timed out',
            content: 'Sorry, the image generation timed out. Please try again.',
          })
          return
        }

        const status = await getTaskStatus(taskId, { prompt, aspect_ratio: aspectRatio, resolution })

        if (status.status === 'completed' && status.output?.media_url) {
          updateAssistantMessage(loadingMessage.id, {
            isLoading: false,
            imageUrl: status.output.media_url,
            content: 'Here\'s your generated image!',
          })
          refreshUser()
        } else if (status.status === 'failed') {
          updateAssistantMessage(loadingMessage.id, {
            isLoading: false,
            error: status.error || 'Generation failed',
            content: 'Sorry, something went wrong. Please try again.',
          })
        } else {
          setTimeout(() => pollResult(taskId, attempts + 1), 2000)
        }
      }

      pollResult(response.taskId)
    } catch (error) {
      // Handle insufficient tokens error
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate'
      if (errorMsg.includes('token') || errorMsg.includes('insufficient')) {
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
        error: errorMsg,
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
      })
    }
  }

  const handleChatMessage = async () => {
    // Auto-create conversation if none selected
    let convId = currentConversationId
    if (!convId) {
      try {
        const newConv = await createConversation(prompt.slice(0, 30), selectedAgent.id)
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

      const agentToUse = mode === 'legal' ? selectedLegalAgent : selectedAgent
      for await (const chunk of streamChat(chatHistory, agentToUse.id, undefined, convId || undefined)) {
        if (chunk.content) {
          fullContent += chunk.content
          updateAssistantMessage(loadingMessage.id, {
            content: fullContent,
            isLoading: true,
          })
        }
        if (chunk.done && chunk.usage) {
          updateAssistantMessage(loadingMessage.id, {
            content: fullContent,
            isLoading: false,
            usage: { tokens: chunk.usage.estimatedTokens, cost: chunk.usage.cost },
          })
          refreshUser()
        }
      }
    } catch (error) {
      // Handle insufficient tokens error
      if (error instanceof InsufficientTokensError) {
        updateAssistantMessage(loadingMessage.id, {
          isLoading: false,
          error: 'Hết token',
          content: 'Bạn đã hết token! Vui lòng nạp thêm để tiếp tục sử dụng.',
        })
        // Redirect to billing after 2 seconds
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
    setMode(suggestion.mode)
    if (suggestion.mode === 'chat') {
      setSelectedAgent(AGENTS.find((a) => a.id === 'general_base') || AGENTS[0])
    }
    setPrompt(`${suggestion.title}: ${suggestion.desc}`)
    textareaRef.current?.focus()
  }

  const AgentIcon = AGENT_ICONS[selectedAgent.icon] || MessageSquare

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
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={16} color="white" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 16 }}>ImageGen AI</span>
            </div>

            {/* Mode & Agent Selector - Always visible */}
            <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
              {/* Mode Toggle */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 8, padding: 2 }}>
                <button
                  className={`option-btn ${mode === 'chat' ? 'active' : ''}`}
                  style={{ borderRadius: 6 }}
                  onClick={() => setMode('chat')}
                >
                  <MessageSquare size={14} />
                  Chat
                </button>
                <a
                  href="/article"
                  className="option-btn"
                  style={{ borderRadius: 6, textDecoration: 'none', color: 'inherit' }}
                >
                  <ImageIcon size={14} />
                  Article
                </a>
{/* Temporarily hidden - keeping only Chat mode
                <button
                  className={`option-btn ${mode === 'image' ? 'active' : ''}`}
                  style={{ borderRadius: 6 }}
                  onClick={() => setMode('image')}
                >
                  <ImageIcon size={14} />
                  Image
                </button>
                <button
                  className={`option-btn ${mode === 'convert' ? 'active' : ''}`}
                  style={{ borderRadius: 6 }}
                  onClick={() => setMode('convert')}
                >
                  <RefreshCw size={14} />
                  Convert
                </button>
                <button
                  className={`option-btn ${mode === 'legal' ? 'active' : ''}`}
                  style={{ borderRadius: 6 }}
                  onClick={() => setMode('legal')}
                >
                  <Scale size={14} />
                  Văn bản
                </button>
*/}
              </div>

              {/* Agent Selector (only for chat mode) */}
              {mode === 'chat' && (
                <div style={{ position: 'relative' }}>
                  <button
                    className="option-btn"
                    onClick={() => {
                      setShowModelMenu(false)
                      setShowUserMenu(false)
                      setShowLegalMenu(false)
                      setShowAgentMenu(!showAgentMenu)
                    }}
                  >
                    <AgentIcon size={14} />
                    {selectedAgent.name}
                    {selectedAgent.tier === 'pro' && <Crown size={12} style={{ color: '#fbbf24' }} />}
                    <ChevronDown size={12} />
                  </button>

                  {showAgentMenu && (
                    <div
                      className="dropdown-menu agent-dropdown"
                      style={{ top: 'calc(100% + 8px)', minWidth: 280, maxHeight: 400, overflowY: 'auto' }}
                    >
                      {AGENT_CATEGORIES.map((category) => {
                        const categoryAgents = AGENTS.filter((a) => a.category === category)
                        return (
                          <div key={category}>
                            <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                              {category}
                            </div>
                            {categoryAgents.map((agent) => {
                              const Icon = AGENT_ICONS[agent.icon] || MessageSquare
                              const isPro = agent.tier === 'pro'

                              return (
                                <div
                                  key={agent.id}
                                  className={`dropdown-item ${selectedAgent.id === agent.id ? 'active' : ''}`}
                                  onClick={() => {
                                    setSelectedAgent(agent)
                                    setShowAgentMenu(false)
                                  }}
                                  style={selectedAgent.id === agent.id ? { background: 'var(--bg-hover)' } : {}}
                                >
                                  <Icon size={16} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontWeight: 500 }}>{agent.name}</span>
                                      {isPro && (
                                        <span style={{
                                          fontSize: 9,
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                          color: '#000',
                                          fontWeight: 600,
                                        }}>
                                          2X TOKEN
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                      {agent.description}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Legal Agent Selector (only for legal mode) */}
              {mode === 'legal' && (
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <button
                    className="option-btn"
                    onClick={() => {
                      setShowAgentMenu(false)
                      setShowUserMenu(false)
                      setShowModelMenu(false)
                      setShowLegalMenu(!showLegalMenu)
                    }}
                  >
                    <Scale size={14} />
                    {selectedLegalAgent.name}
                    {selectedLegalAgent.tier === 'pro' && <Crown size={12} style={{ color: '#fbbf24' }} />}
                    <ChevronDown size={12} />
                  </button>

                  {showLegalMenu && (
                    <div
                      className="dropdown-menu"
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', bottom: 'auto', minWidth: 280, zIndex: 9999, left: 0, right: 'auto' }}
                    >
                      {AGENTS.filter(a => a.category === 'legal').map((agent) => {
                        const isSelected = selectedLegalAgent.id === agent.id
                        const isPro = agent.tier === 'pro'

                        return (
                          <div
                            key={agent.id}
                            className={`dropdown-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedLegalAgent(agent)
                              setShowLegalMenu(false)
                            }}
                            style={isSelected ? { background: 'var(--bg-hover)' } : {}}
                          >
                            <Scale size={16} style={isPro ? { color: '#fbbf24' } : {}} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 500 }}>{agent.name}</span>
                                {isPro && (
                                  <span style={{
                                    fontSize: 9,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                    color: '#000',
                                    fontWeight: 600,
                                  }}>
                                    2X TOKEN
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {agent.description}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Model Selector (only for image mode) */}
              {mode === 'image' && (
                <div style={{ position: 'relative', zIndex: 100 }}>
                  <button
                    className="option-btn"
                    onClick={() => {
                      setShowAgentMenu(false)
                      setShowUserMenu(false)
                      setShowLegalMenu(false)
                      setShowModelMenu(!showModelMenu)
                    }}
                  >
                    <Sparkles size={14} />
                    {selectedImageModel.name}
                    {selectedImageModel.tier === 'pro' && <Crown size={12} style={{ color: '#fbbf24' }} />}
                    <ChevronDown size={12} />
                  </button>

                  {showModelMenu && (
                    <div
                      className="dropdown-menu"
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', bottom: 'auto', minWidth: 300, maxHeight: 400, overflowY: 'auto', zIndex: 9999, left: 0, right: 'auto' }}
                    >
                      {/* Base Models */}
                      <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        Base Models
                      </div>
                      {IMAGE_MODELS.filter(m => m.tier === 'base').map((model) => {
                        const isSelected = selectedImageModel.id === model.id
                        return (
                          <div
                            key={model.id}
                            className={`dropdown-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedImageModel(model)
                              setShowModelMenu(false)
                            }}
                            style={isSelected ? { background: 'var(--bg-hover)' } : {}}
                          >
                            <Sparkles size={16} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 500 }}>{model.name}</span>
                                <span style={{
                                  fontSize: 9,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: model.speed === 'fast' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                  color: model.speed === 'fast' ? '#22c55e' : '#3b82f6',
                                  fontWeight: 500,
                                }}>
                                  {model.speed === 'fast' ? '⚡ Fast' : '⏱ Medium'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {model.description}
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Pro Models (2x Token) */}
                      <div style={{ padding: '12px 14px 4px', fontSize: 11, fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Crown size={12} />
                        Pro Models (2x Token)
                      </div>
                      {IMAGE_MODELS.filter(m => m.tier === 'pro').map((model) => {
                        const isSelected = selectedImageModel.id === model.id

                        return (
                          <div
                            key={model.id}
                            className={`dropdown-item ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedImageModel(model)
                              setShowModelMenu(false)
                            }}
                            style={isSelected ? { background: 'var(--bg-hover)' } : {}}
                          >
                            <Sparkles size={16} style={{ color: '#fbbf24' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 500 }}>{model.name}</span>
                                <span style={{
                                  fontSize: 9,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                  color: '#000',
                                  fontWeight: 600,
                                }}>
                                  2X TOKEN
                                </span>
                                <span style={{
                                  fontSize: 9,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: model.quality === 'ultra' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                  color: model.quality === 'ultra' ? '#8b5cf6' : '#22c55e',
                                  fontWeight: 500,
                                }}>
                                  {model.quality === 'ultra' ? '✨ Ultra' : '⚡ Fast'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                {model.description}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
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
          {mode === 'convert' ? (
            <div className="convert-screen">
              <h1 className="welcome-title">Document Converter</h1>
              <p className="welcome-subtitle">
                Convert Word documents to PDF and vice versa.
              </p>
              <DocumentConverter />
            </div>
          ) : messages.length === 0 ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">What will you create today?</h1>
              <p className="welcome-subtitle">
                Generate images with AI or chat with specialized assistants.
              </p>

              <div className="suggestions">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="suggestion-card"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="suggestion-title">
                      {suggestion.mode === 'image' ? '🖼️' : '💬'} {suggestion.title}
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
                    <div className="message-avatar">
                      <Sparkles size={16} color="white" />
                    </div>
                  )}

                  <div className="message-content">
                    {message.isLoading && !message.content ? (
                      <div className="loading-dots">
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                        <div className="loading-dot" />
                      </div>
                    ) : (
                      <>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
                        {message.settings && message.role === 'user' && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, opacity: 0.7, fontSize: 12, flexWrap: 'wrap' }}>
                            {message.settings.model && (
                              <>
                                <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{message.settings.model}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{message.settings.aspectRatio}</span>
                            <span>•</span>
                            <span>{message.settings.resolution}</span>
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
                          <Loader2 size={14} style={{ marginTop: 8, animation: 'spin 1s linear infinite' }} />
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

        {/* Input Area - Hide for convert mode */}
        {mode !== 'convert' && (
        <div className="input-area">
          <div className="input-container" style={{ position: 'relative' }}>
            {/* Settings Panel (Image mode only) */}
            {showSettings && mode === 'image' && (
              <div className="settings-panel">
                <div className="settings-row">
                  <span className="settings-label">Aspect Ratio</span>
                  <div className="settings-options">
                    {(['1:1', '16:9', '9:16', '4:3', '3:4'] as AspectRatio[]).map((ratio) => (
                      <button
                        key={ratio}
                        className={`settings-option ${aspectRatio === ratio ? 'active' : ''}`}
                        onClick={() => setAspectRatio(ratio)}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Resolution</span>
                  <div className="settings-options">
                    {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                      <button
                        key={res}
                        className={`settings-option ${resolution === res ? 'active' : ''}`}
                        onClick={() => setResolution(res)}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                  Add image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />

                {mode === 'image' && (
                  <button
                    className={`option-btn ${showSettings ? 'active' : ''}`}
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings size={14} />
                    {aspectRatio} • {resolution}
                    <ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                className="prompt-input"
                placeholder={
                  isAuthenticated
                    ? mode === 'image'
                      ? 'Describe the image you want to create...'
                      : mode === 'legal'
                      ? `Hỏi ${selectedLegalAgent.name}...`
                      : `Ask ${selectedAgent.name}...`
                    : 'Sign in to start...'
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
        )}
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

