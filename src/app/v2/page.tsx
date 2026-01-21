'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Send,
  MessageSquare,
  FileText,
  BookOpen,
  Loader2,
  Bot,
  Brain,
  ChevronRight,
  ChevronDown,
  Check,
  Inbox,
  Search,
  Database,
  Cpu,
  SendHorizontal,
} from 'lucide-react'
import { useConversation } from './v2-layout-client'
import { streamChat } from '@/lib/api/chat'
import { getConversation, createConversation, type ConversationMessage } from '@/lib/api/conversations'
import { useAuth } from '@/contexts/auth-context'

interface WorkflowNode {
  id: string
  label: string
  icon: 'input' | 'search' | 'database' | 'ai' | 'output'
  status: 'idle' | 'running' | 'completed'
}

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
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([
    { id: '1', label: 'Nhận input', icon: 'input', status: 'idle' },
    { id: '2', label: 'Phân tích', icon: 'search', status: 'idle' },
    { id: '3', label: 'Truy xuất', icon: 'database', status: 'idle' },
    { id: '4', label: 'Tạo response', icon: 'ai', status: 'idle' },
    { id: '5', label: 'Output', icon: 'output', status: 'idle' },
  ])
  const [thinkingHeight, setThinkingHeight] = useState(250) // px
  const [isResizing, setIsResizing] = useState(false)
  const [rightPanelWidth, setRightPanelWidth] = useState(340)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const [isResizingCorner, setIsResizingCorner] = useState(false)
  const [exercisesExpanded, setExercisesExpanded] = useState(true)
  const [guidesExpanded, setGuidesExpanded] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Resize handlers for thinking height
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newHeight = e.clientY - containerRect.top
    // Min 100px, max 60% of container
    const maxHeight = containerRect.height * 0.6
    setThinkingHeight(Math.max(100, Math.min(newHeight, maxHeight)))
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  // Resize handlers for right panel width
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingRight(true)
  }, [])

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRight) return
    const newWidth = window.innerWidth - e.clientX
    // Min 200px, max 600px
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

  // Resize handlers for corner (both directions)
  const handleCornerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingCorner(true)
  }, [])

  const handleCornerMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingCorner || !containerRef.current) return

    // Update thinking height
    const containerRect = containerRef.current.getBoundingClientRect()
    const newHeight = e.clientY - containerRect.top
    const maxHeight = containerRect.height * 0.6
    setThinkingHeight(Math.max(100, Math.min(newHeight, maxHeight)))

    // Update right panel width
    const newWidth = window.innerWidth - e.clientX
    setRightPanelWidth(Math.max(200, Math.min(newWidth, 600)))
  }, [isResizingCorner])

  const handleCornerMouseUp = useCallback(() => {
    setIsResizingCorner(false)
  }, [])

  useEffect(() => {
    if (isResizingCorner) {
      document.addEventListener('mousemove', handleCornerMouseMove)
      document.addEventListener('mouseup', handleCornerMouseUp)
      document.body.style.cursor = 'move'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleCornerMouseMove)
      document.removeEventListener('mouseup', handleCornerMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingCorner, handleCornerMouseMove, handleCornerMouseUp])

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

    // Reset workflow nodes
    setWorkflowNodes(nodes => nodes.map(n => ({ ...n, status: 'idle' as const })))

    // Helper function
    const updateNode = (id: string, status: 'running' | 'completed') => {
      setWorkflowNodes(nodes => nodes.map(n => n.id === id ? { ...n, status } : n))
    }

    try {
      // Create conversation if none selected
      let convId = currentConversationId
      if (!convId) {
        const newConv = await createConversation(userContent.slice(0, 50))
        convId = newConv.id
        setCurrentConversationId(convId)
        await refreshConversations()
      }

      // Node 1: Nhận input
      updateNode('1', 'running')
      await new Promise((resolve) => setTimeout(resolve, 300))
      updateNode('1', 'completed')

      // Node 2: Phân tích
      updateNode('2', 'running')

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

      updateNode('2', 'completed')

      // Node 3: Truy xuất
      updateNode('3', 'running')
      await new Promise((resolve) => setTimeout(resolve, 200))
      updateNode('3', 'completed')

      // Node 4: Tạo response - stream
      updateNode('4', 'running')

      let fullContent = ''
      for await (const chunk of streamChat(apiMessages, 'general_base', undefined, convId)) {
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

      updateNode('4', 'completed')

      // Node 5: Output
      updateNode('5', 'running')
      await new Promise((resolve) => setTimeout(resolve, 200))
      updateNode('5', 'completed')

    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
        timestamp: new Date(),
      }])
      // Reset nodes on error
      setWorkflowNodes(nodes => nodes.map(n => ({ ...n, status: 'idle' as const })))
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
      {/* Center: Agent Thinking + Chat */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Agent Workflow Window */}
        <div
          style={{
            height: thinkingHeight,
            minHeight: 100,
            background: 'var(--bg-secondary)',
            padding: 16,
            overflow: 'auto',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              color: 'var(--text-secondary)',
            }}
          >
            <Brain size={16} style={{ color: '#a78bfa' }} />
            <span style={{ fontWeight: 500, fontSize: 13 }}>Agent Workflow</span>
          </div>

          {/* Workflow Nodes - n8n style */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              padding: '24px 0',
              minHeight: 100,
            }}
          >
            {workflowNodes.map((node, index) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                {/* Node - n8n style */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {/* Node box */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        background: '#1a1a2e',
                        border: node.status === 'running'
                          ? '2px solid #ff6d5a'
                          : node.status === 'completed'
                          ? '2px solid #1a1a2e'
                          : '2px solid #2a2a3e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: node.status === 'running'
                          ? '0 0 0 3px rgba(255, 109, 90, 0.2)'
                          : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {node.icon === 'input' && <Inbox size={22} color={node.status === 'idle' ? '#6b7280' : '#ff6d5a'} />}
                      {node.icon === 'search' && <Search size={22} color={node.status === 'idle' ? '#6b7280' : '#a78bfa'} />}
                      {node.icon === 'database' && <Database size={22} color={node.status === 'idle' ? '#6b7280' : '#22d3ee'} />}
                      {node.icon === 'ai' && <Cpu size={22} color={node.status === 'idle' ? '#6b7280' : '#f472b6'} />}
                      {node.icon === 'output' && <SendHorizontal size={22} color={node.status === 'idle' ? '#6b7280' : '#4ade80'} />}
                    </div>
                    {/* Success checkmark - n8n style (top right) */}
                    {node.status === 'completed' && (
                      <div style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Check size={12} color="white" strokeWidth={3} />
                      </div>
                    )}
                    {/* Running indicator */}
                    {node.status === 'running' && (
                      <div style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: '#ff6d5a',
                        animation: 'n8nPulse 1s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                  {/* Label */}
                  <span
                    style={{
                      fontSize: 11,
                      color: node.status === 'idle' ? '#6b7280' : '#e5e7eb',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {node.label}
                  </span>
                </div>

                {/* Connector line - n8n style (curved bezier feel with straight line) */}
                {index < workflowNodes.length - 1 && (
                  <div
                    style={{
                      width: 50,
                      height: 2,
                      background: node.status === 'completed'
                        ? '#4ade80'
                        : '#2a2a3e',
                      margin: '0 8px',
                      marginBottom: 26,
                      borderRadius: 1,
                      transition: 'all 0.3s ease',
                    }}
                  />
                )}
              </div>
            ))}
          </div>

        </div>

        {/* Resizable Divider */}
        <div
          style={{
            height: 6,
            display: 'flex',
            flexShrink: 0,
          }}
        >
          {/* Horizontal resize area */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              flex: 1,
              background: isResizing || isResizingCorner ? 'var(--accent)' : 'var(--border-color)',
              cursor: 'row-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isResizing || isResizingCorner ? 'none' : 'background 0.15s',
            }}
          >
            <div
              style={{
                width: 40,
                height: 3,
                borderRadius: 2,
                background: isResizing || isResizingCorner ? 'white' : 'var(--text-tertiary)',
              }}
            />
          </div>
        </div>

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
                          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
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
        style={{
          width: 6,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Corner resize handle - at intersection of horizontal and vertical dividers */}
        <div
          onMouseDown={handleCornerMouseDown}
          style={{
            height: thinkingHeight + 6, // thinking height + divider height
            width: 6,
            background: isResizingCorner ? 'var(--accent)' : 'var(--border-color)',
            cursor: 'move',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 3,
            transition: isResizingCorner ? 'none' : 'background 0.15s',
          }}
        >
          {/* Corner indicator dots */}
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: isResizingCorner ? 'white' : 'var(--text-tertiary)',
            }}
          />
        </div>
        {/* Vertical resize area */}
        <div
          onMouseDown={handleRightMouseDown}
          style={{
            flex: 1,
            background: isResizingRight || isResizingCorner ? 'var(--accent)' : 'var(--border-color)',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isResizingRight || isResizingCorner ? 'none' : 'background 0.15s',
          }}
        >
          <div
            style={{
              width: 3,
              height: 40,
              borderRadius: 2,
              background: isResizingRight || isResizingCorner ? 'white' : 'var(--text-tertiary)',
            }}
          />
        </div>
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
        @keyframes n8nPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
