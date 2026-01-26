'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  MessageSquare,
  FileText,
  BookOpen,
  Loader2,
  Bot,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const language = className?.replace('language-', '') || ''

  const handleCopy = () => {
    navigator.clipboard.writeText(children.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        {language && <span className="code-block-lang">{language}</span>}
        <button onClick={handleCopy} className="code-copy-btn">
          {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
        </button>
      </div>
      <pre><code className={className}>{children}</code></pre>
    </div>
  )
}
import { useConversation } from './v2-layout-client'
import { streamChat } from '@/lib/api/chat'
import { getConversation, createConversation, type ConversationMessage } from '@/lib/api/conversations'
import { useAuth } from '@/contexts/auth-context'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: Date
  isLoading?: boolean
}

interface Exercise {
  id: string
  title: string
  description?: string
  completed: boolean
}

interface Guide {
  id: string
  title: string
  content?: string
}

export default function V2Page() {
  const { isAuthenticated } = useAuth()
  const { currentConversationId, setCurrentConversationId, refreshConversations } = useConversation()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(340)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const [exercisesExpanded, setExercisesExpanded] = useState(true)
  const [guidesExpanded, setGuidesExpanded] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const exercises: Exercise[] = [
    { id: '1', title: 'Bài 1: Giới thiệu cơ bản', description: 'Làm quen với AI Agent', completed: true },
    { id: '2', title: 'Bài 2: Kỹ thuật viết Prompt', description: 'Viết prompt hiệu quả', completed: false },
    { id: '3', title: 'Bài 3: RAG & Truy xuất', description: 'Tìm kiếm và truy xuất', completed: false },
    { id: '4', title: 'Bài 4: Phát triển Agent', description: 'Xây dựng Agent riêng', completed: false },
  ]

  const guides: Guide[] = [
    { id: '1', title: '1. Hướng dẫn sử dụng cơ bản', content: 'Hướng dẫn chi tiết về cách sử dụng nền tảng Learn N8N. Bao gồm các bước cơ bản để bắt đầu học, cách tương tác với AI Agent, và các tính năng chính của hệ thống.' },
    { id: '2', title: '2. Cách viết prompt hiệu quả', content: 'Học cách viết prompt để có được kết quả tốt nhất từ AI. Bao gồm các kỹ thuật như: cung cấp ngữ cảnh, chia nhỏ yêu cầu, sử dụng ví dụ, và cách tinh chỉnh kết quả.' },
    { id: '3', title: '3. Tích hợp với API', content: 'Hướng dẫn tích hợp Learn N8N API vào ứng dụng của bạn. Bao gồm xác thực, các điểm cuối chính, giới hạn tốc độ, và các thực hành tốt nhất cho môi trường sản xuất.' },
    { id: '4', title: '4. Các thực hành tốt nhất', content: 'Tổng hợp các thực hành tốt nhất khi làm việc với AI Agent. Bao gồm cách tối ưu sử dụng token, xử lý lỗi, và các mẫu phổ biến trong phát triển AI.' },
  ]

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConversationId || !isAuthenticated) {
        setMessages([])
        return
      }
      try {
        const conv = await getConversation(currentConversationId)
        setMessages(conv.messages.map((m: ConversationMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })))
      } catch (error) {
        console.error('Failed to load messages:', error)
        setMessages([])
      }
    }
    loadMessages()
  }, [currentConversationId, isAuthenticated])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Resize handlers for right panel width
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingRight(true)
  }, [])

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRight) return
    const newWidth = window.innerWidth - e.clientX
    setRightPanelWidth(Math.max(200, Math.min(newWidth, 600)))
  }, [isResizingRight])

  const handleRightMouseUp = useCallback(() => {
    setIsResizingRight(false)
  }, [])

  useEffect(() => {
    if (isResizingRight) {
      document.addEventListener('mousemove', handleRightMouseMove)
      document.addEventListener('mouseup', handleRightMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleRightMouseMove)
      document.removeEventListener('mouseup', handleRightMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingRight, handleRightMouseMove, handleRightMouseUp])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !isAuthenticated) return

    const userContent = inputValue.trim()
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userContent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsThinking(true)

    try {
      // Create conversation if none selected
      let convId = currentConversationId
      if (!convId) {
        const newConv = await createConversation(userContent.slice(0, 50))
        convId = newConv.id
        setCurrentConversationId(convId)
        await refreshConversations()
      }

      // Build messages for API
      const apiMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      // Create placeholder for streaming response
      const assistantMessageId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      }])

      let fullContent = ''
      for await (const chunk of streamChat(apiMessages, undefined, convId)) {
        if (chunk.content) {
          fullContent += chunk.content
          setMessages((prev) => prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: fullContent, isLoading: false }
              : m
          ))
        }
        if (chunk.done) {
          break
        }
        if (chunk.error) {
          throw new Error(chunk.error)
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: new Date(),
      }])
    }

    setIsThinking(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 76px)', overflow: 'hidden', position: 'relative' }}>
      {/* Center: Chat */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Chat Window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
            }}
          >
            <MessageSquare size={16} style={{ color: '#8b5cf6' }} />
            <span style={{ fontWeight: 500, fontSize: 13 }}>Khung chat hỏi đáp</span>
          </div>

          {/* Messages */}
          <div className="chat-area" style={{ flex: 1, padding: 16, overflow: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Chào mừng đến Learn N8N!
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đặt câu hỏi để bắt đầu học</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="message-avatar">
                        <Bot size={14} color="white" />
                      </div>
                    )}
                    <div className="message-content">
                      {msg.isLoading ? (
                        <div className="loading-dots">
                          <div className="loading-dot" />
                          <div className="loading-dot" />
                          <div className="loading-dot" />
                        </div>
                      ) : (
                        <>
                          {msg.role === 'assistant' ? (
                            <div className="markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  pre({ children }) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const child = children as any
                                    const className = child?.props?.className || ''
                                    const content = String(child?.props?.children || '')
                                    return <CodeBlock className={className}>{content}</CodeBlock>
                                  },
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                          )}
                          <span style={{ fontSize: 10, marginTop: 4, display: 'block', opacity: 0.6 }}>
                            {msg.timestamp.toLocaleTimeString('vi-VN')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
            <div className="input-wrapper" style={{ maxWidth: '100%' }}>
              <textarea
                ref={textareaRef}
                className="prompt-input"
                placeholder="Nhập câu hỏi của bạn..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isThinking}
                rows={1}
                style={{ paddingRight: 50 }}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isThinking}
              >
                {isThinking ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel Resize Divider */}
      <div
        onMouseDown={handleRightMouseDown}
        style={{
          width: 6,
          background: isResizingRight ? 'var(--accent)' : 'var(--border-color)',
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: isResizingRight ? 'none' : 'background 0.15s',
        }}
      >
        <div
          style={{
            width: 3,
            height: 40,
            borderRadius: 2,
            background: isResizingRight ? 'white' : 'var(--text-tertiary)',
          }}
        />
      </div>

      {/* Right Panel: Exercises + Guides */}
      <aside
        style={{
          width: rightPanelWidth,
          minWidth: rightPanelWidth,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Exercises */}
        <div
          style={{
            borderBottom: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => setExercisesExpanded(!exercisesExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 16px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {exercisesExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            )}
            <BookOpen size={18} style={{ color: '#22c55e' }} />
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Bài tập thực hành</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {exercises.filter(e => e.completed).length}/{exercises.length}
            </span>
          </div>

          <div
            style={{
              maxHeight: exercisesExpanded ? 400 : 0,
              overflowY: exercisesExpanded ? 'auto' : 'hidden',
              transition: 'max-height 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' }}>
              {exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  onClick={() => setSelectedExercise(selectedExercise === exercise.id ? null : exercise.id)}
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: exercise.completed ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        border: `2px solid ${exercise.completed ? '#22c55e' : 'var(--text-tertiary)'}`,
                        background: exercise.completed ? '#22c55e' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {exercise.completed && (
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="white">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: exercise.completed ? '#22c55e' : 'var(--text-primary)',
                        }}
                      >
                        {exercise.title}
                      </div>
                      {exercise.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                          {exercise.description}
                        </div>
                      )}
                    </div>
                    {selectedExercise === exercise.id ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    )}
                  </div>
                  {/* Expanded Content */}
                  <div
                    style={{
                      maxHeight: selectedExercise === exercise.id ? 150 : 0,
                      overflowY: selectedExercise === exercise.id ? 'auto' : 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '0 12px 12px',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 12,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      <p style={{ margin: 0, marginBottom: 10 }}>
                        {exercise.description} - Nội dung chi tiết của bài tập sẽ được hiển thị tại đây.
                      </p>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '6px 12px',
                          background: exercise.completed ? 'var(--bg-tertiary)' : '#22c55e',
                          color: exercise.completed ? 'var(--text-secondary)' : 'white',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        {exercise.completed ? 'Xem lại' : 'Bắt đầu học'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guides */}
        <div
          style={{
            overflow: 'hidden',
          }}
        >
          <div
            onClick={() => setGuidesExpanded(!guidesExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 16px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {guidesExpanded ? (
              <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />
            ) : (
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            )}
            <FileText size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>Tài liệu hướng dẫn</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {guides.length} mục
            </span>
          </div>

          <div
            style={{
              maxHeight: guidesExpanded ? 400 : 0,
              overflowY: guidesExpanded ? 'auto' : 'hidden',
              transition: 'max-height 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 16px' }}>
              {guides.map((guide) => (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuide(selectedGuide === guide.id ? null : guide.id)}
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{guide.title}</span>
                    {selectedGuide === guide.id ? (
                      <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                    ) : (
                      <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                    )}
                  </div>
                  {/* Expanded Content */}
                  <div
                    style={{
                      maxHeight: selectedGuide === guide.id ? 150 : 0,
                      overflowY: selectedGuide === guide.id ? 'auto' : 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '0 12px 12px',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 12,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                      }}
                    >
                      <p style={{ margin: 0 }}>{guide.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
