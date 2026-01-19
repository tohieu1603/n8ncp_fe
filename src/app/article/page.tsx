'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ImagePlus,
  Send,
  Download,
  Loader2,
  Sparkles,
  ChevronDown,
  Crown,
  Lock,
  Menu,
  ArrowLeft,
  Check,
  X,
  RefreshCw,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import {
  streamChat,
  createArticleImageBatch,
  pollBatchArticleImageStatus,
  hasEnoughTokens,
  getRemainingTokens,
  ArticleImageStatus,
  ArticleImageInput,
} from '@/lib/api'

type ArticleImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

interface GeneratedImage {
  prompt: string
  aspect_ratio: ArticleImageAspectRatio
  description: string
  taskId?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

interface AgentResponse {
  images: {
    prompt: string
    aspect_ratio: ArticleImageAspectRatio
    description: string
  }[]
  style_guide?: {
    overall_tone: string
    color_palette: string
    visual_style: string
  }
}

export default function ArticleIllustrator() {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [articleContent, setArticleContent] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState('')
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [selectedAgent, setSelectedAgent] = useState<'article_image' | 'article_image_pro'>('article_image')
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const userHasPro = user?.isPro || false

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 400)}px`
    }
  }, [articleContent])

  const handleAnalyze = async () => {
    if (!articleContent.trim() || !isAuthenticated) return

    // Check token balance
    const estimatedTokens = 3000
    if (!hasEnoughTokens(user, estimatedTokens)) {
      const remaining = getRemainingTokens(user)
      alert(`Không đủ token! Còn lại: ${remaining.toLocaleString()} token.\nVui lòng nạp thêm để tiếp tục sử dụng.`)
      window.location.href = '/account/billing'
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress('Đang phân tích nội dung bài viết...')
    setGeneratedImages([])

    try {
      // Step 1: Send article to AI agent to get image prompts
      let fullContent = ''
      const chatHistory = [{ role: 'user', content: articleContent }]

      for await (const chunk of streamChat(chatHistory, selectedAgent)) {
        if (chunk.content) {
          fullContent += chunk.content
        }
      }

      // Step 2: Parse the JSON response
      setAnalysisProgress('Đang xử lý kết quả...')

      // Extract JSON from response (handle markdown code blocks)
      let jsonContent = fullContent
      const jsonMatch = fullContent.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }

      const response: AgentResponse = JSON.parse(jsonContent.trim())

      if (!response.images || response.images.length === 0) {
        throw new Error('Không tìm thấy prompt nào từ AI')
      }

      // Step 3: Create image tasks (z-image only uses prompt + aspect_ratio)
      const images: GeneratedImage[] = response.images.map((img) => ({
        prompt: img.prompt,
        aspect_ratio: img.aspect_ratio || '16:9',
        description: img.description || '',
        status: 'pending' as const,
      }))

      setGeneratedImages(images)
      setAnalysisProgress(`Đang tạo ${images.length} ảnh minh họa...`)

      // Step 4: Create batch image generation
      const batchInput: ArticleImageInput[] = images.map((img) => ({
        prompt: img.prompt,
        aspect_ratio: img.aspect_ratio,
      }))

      const batchResult = await createArticleImageBatch(batchInput)

      // Update images with taskIds
      const updatedImages = images.map((img, idx) => {
        const taskId = batchResult.taskIds[idx]
        const error = batchResult.errors.find((e) => e.index === idx)
        return {
          ...img,
          taskId,
          status: error ? ('failed' as const) : ('generating' as const),
          error: error?.error,
        }
      })

      setGeneratedImages(updatedImages)

      // Step 5: Poll for results
      if (batchResult.taskIds.length > 0) {
        const results = await pollBatchArticleImageStatus(
          batchResult.taskIds,
          (statusResults: ArticleImageStatus[]) => {
            setGeneratedImages((prev) =>
              prev.map((img) => {
                const status = statusResults.find((s) => s.taskId === img.taskId)
                if (!status) return img
                return {
                  ...img,
                  status: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'generating',
                  imageUrl: status.output?.media_url,
                  error: status.error,
                }
              })
            )
          }
        )

        // Final update
        setGeneratedImages((prev) =>
          prev.map((img) => {
            const status = results.find((s: ArticleImageStatus) => s.taskId === img.taskId)
            if (!status) return img
            return {
              ...img,
              status: status.status === 'completed' ? 'completed' : 'failed',
              imageUrl: status.output?.media_url,
              error: status.error,
            }
          })
        )

        refreshUser()
      }

      setAnalysisProgress('')
    } catch (error) {
      console.error('Article analysis error:', error)
      setAnalysisProgress('')
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra khi phân tích bài viết')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDownload = (imageUrl: string, index: number) => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `article-image-${index + 1}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleRetry = async (index: number) => {
    const img = generatedImages[index]
    if (!img || img.status !== 'failed') return

    setGeneratedImages((prev) =>
      prev.map((item, i) => (i === index ? { ...item, status: 'generating' as const, error: undefined } : item))
    )

    try {
      const batchResult = await createArticleImageBatch([
        { prompt: img.prompt, aspect_ratio: img.aspect_ratio },
      ])

      if (batchResult.taskIds.length > 0) {
        const results = await pollBatchArticleImageStatus(batchResult.taskIds)
        const result = results[0]

        setGeneratedImages((prev) =>
          prev.map((item, i) =>
            i === index
              ? {
                  ...item,
                  taskId: batchResult.taskIds[0],
                  status: result.status === 'completed' ? 'completed' : 'failed',
                  imageUrl: result.output?.media_url,
                  error: result.error,
                }
              : item
          )
        )

        refreshUser()
      }
    } catch (error) {
      setGeneratedImages((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, status: 'failed' as const, error: error instanceof Error ? error.message : 'Lỗi' }
            : item
        )
      )
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition">
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Quay lại</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <ImagePlus size={16} />
              </div>
              <span className="font-semibold">Article Illustrator</span>
            </div>
          </div>

          {/* Agent Selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
              onClick={() => setShowAgentMenu(!showAgentMenu)}
            >
              <ImagePlus size={14} />
              <span>{selectedAgent === 'article_image' ? 'Basic' : 'Pro'}</span>
              {selectedAgent === 'article_image_pro' && <Crown size={12} className="text-yellow-400" />}
              <ChevronDown size={12} />
            </button>

            {showAgentMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
                <button
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition ${selectedAgent === 'article_image' ? 'bg-gray-700' : ''}`}
                  onClick={() => {
                    setSelectedAgent('article_image')
                    setShowAgentMenu(false)
                  }}
                >
                  <div className="font-medium">Basic</div>
                  <div className="text-xs text-gray-400">Tạo ảnh minh họa cơ bản</div>
                </button>
                <button
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition ${selectedAgent === 'article_image_pro' ? 'bg-gray-700' : ''} ${!userHasPro ? 'opacity-60' : ''}`}
                  onClick={() => {
                    if (!userHasPro) {
                      window.location.href = '/account/billing'
                      return
                    }
                    setSelectedAgent('article_image_pro')
                    setShowAgentMenu(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pro</span>
                    <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">PRO</span>
                    {!userHasPro && <Lock size={12} className="text-gray-500" />}
                  </div>
                  <div className="text-xs text-gray-400">Style guide + HD quality</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Nội dung bài viết</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent p-4 text-sm resize-none focus:outline-none min-h-[300px]"
                placeholder="Dán nội dung bài viết của bạn vào đây...&#10;&#10;AI sẽ phân tích và tạo ra các ảnh minh họa phù hợp với từng phần nội dung."
                value={articleContent}
                onChange={(e) => setArticleContent(e.target.value)}
                disabled={isAnalyzing}
              />
              <div className="border-t border-gray-800 p-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {articleContent.length.toLocaleString()} ký tự
                </div>
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
                  onClick={handleAnalyze}
                  disabled={!articleContent.trim() || isAnalyzing || !isAuthenticated}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Tạo ảnh minh họa
                    </>
                  )}
                </button>
              </div>
            </div>

            {analysisProgress && (
              <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-300 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {analysisProgress}
              </div>
            )}

            {!isAuthenticated && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg text-center">
                <p className="text-gray-400 mb-3">Đăng nhập để sử dụng tính năng này</p>
                <Link
                  href="/auth/login"
                  className="inline-block px-4 py-2 bg-purple-500 rounded-lg font-medium hover:bg-purple-600 transition"
                >
                  Đăng nhập
                </Link>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Ảnh minh họa
              {generatedImages.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({generatedImages.filter((i) => i.status === 'completed').length}/{generatedImages.length})
                </span>
              )}
            </h2>

            {generatedImages.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
                <ImagePlus size={48} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-500">
                  Dán nội dung bài viết và nhấn &quot;Tạo ảnh minh họa&quot; để bắt đầu
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedImages.map((img, index) => (
                  <div key={index} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-3 border-b border-gray-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Ảnh {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{img.aspect_ratio}</span>
                          {img.status === 'completed' && (
                            <Check size={14} className="text-green-500" />
                          )}
                          {img.status === 'generating' && (
                            <Loader2 size={14} className="text-purple-400 animate-spin" />
                          )}
                          {img.status === 'failed' && (
                            <X size={14} className="text-red-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{img.description}</p>
                    </div>

                    <div className="aspect-video bg-gray-950 relative">
                      {img.status === 'generating' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 size={32} className="mx-auto text-purple-400 animate-spin mb-2" />
                            <p className="text-sm text-gray-500">Đang tạo ảnh...</p>
                          </div>
                        </div>
                      )}

                      {img.status === 'completed' && img.imageUrl && (
                        <Image
                          src={img.imageUrl}
                          alt={img.description}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      )}

                      {img.status === 'failed' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <X size={32} className="mx-auto text-red-500 mb-2" />
                            <p className="text-sm text-red-400">{img.error || 'Tạo ảnh thất bại'}</p>
                            <button
                              className="mt-3 px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center gap-1.5 mx-auto"
                              onClick={() => handleRetry(index)}
                            >
                              <RefreshCw size={12} />
                              Thử lại
                            </button>
                          </div>
                        </div>
                      )}

                      {img.status === 'pending' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-sm text-gray-600">Đang chờ...</p>
                        </div>
                      )}
                    </div>

                    {img.status === 'completed' && img.imageUrl && (
                      <div className="p-3 border-t border-gray-800 flex justify-end">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 rounded-lg hover:bg-gray-700 transition"
                          onClick={() => handleDownload(img.imageUrl!, index)}
                        >
                          <Download size={12} />
                          Tải xuống
                        </button>
                      </div>
                    )}

                    {/* Show prompt in collapsible */}
                    <details className="border-t border-gray-800">
                      <summary className="px-3 py-2 text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition">
                        Xem prompt
                      </summary>
                      <div className="px-3 pb-3">
                        <p className="text-xs text-gray-400 font-mono bg-gray-950 p-2 rounded">{img.prompt}</p>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
