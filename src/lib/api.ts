const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Auth token management
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token')
  }
  return authToken
}

export function clearAuth() {
  authToken = null
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

// API response type from backend
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// API helpers
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const json: ApiResponse<T> = await response.json()

  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Request failed')
  }

  return json.data as T
}

// Auth API
export interface AuthData {
  token: string
  user: {
    id: string
    email: string
    name: string | null
    creditsUsed?: number
    totalSpentUsd?: number
    isPro?: boolean
    proExpiresAt?: string | null
  }
}

export interface User {
  id: string
  email: string
  name: string | null
  creditsUsed: number
  totalSpentUsd: number
  isPro: boolean
  proExpiresAt: string | null
  createdAt: string
  // Token balance - số token còn lại có thể sử dụng
  tokenBalance: number
  // Token limit - tổng token đã mua
  tokenLimit: number
}

// Kiểm tra user còn đủ token không
export function hasEnoughTokens(user: User | null, estimatedTokens: number = 1000): boolean {
  if (!user) return false
  return user.tokenBalance >= estimatedTokens
}

// Lấy số token còn lại
export function getRemainingTokens(user: User | null): number {
  if (!user) return 0
  return Math.max(0, user.tokenBalance)
}

// Error class cho hết token
export class InsufficientTokensError extends Error {
  constructor(remaining: number, required: number) {
    super(`Không đủ token. Còn lại: ${remaining}, cần: ${required}. Vui lòng nạp thêm.`)
    this.name = 'InsufficientTokensError'
  }
}

export async function login(email: string, password: string): Promise<AuthData> {
  const data = await fetchApi<AuthData>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setAuthToken(data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthData> {
  const data = await fetchApi<AuthData>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
  setAuthToken(data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function getMe(): Promise<User> {
  return fetchApi<User>('/api/auth/me')
}

// Generate API
export interface GenerateResponse {
  taskId: string
  message: string
}

export interface StatusResponse {
  taskId: string
  status: 'processing' | 'completed' | 'failed'
  output?: {
    media_url?: string
  }
  error?: string
}

export async function generateImage(input: {
  prompt: string
  image_input?: string[]
  aspect_ratio?: string
  resolution?: string
  output_format?: string
  model?: string
}): Promise<GenerateResponse> {
  return fetchApi<GenerateResponse>('/api/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getTaskStatus(
  taskId: string,
  metadata?: { prompt?: string; aspect_ratio?: string; resolution?: string }
): Promise<StatusResponse> {
  const params = new URLSearchParams({ taskId })
  if (metadata?.prompt) params.append('prompt', metadata.prompt)
  if (metadata?.aspect_ratio) params.append('aspect_ratio', metadata.aspect_ratio)
  if (metadata?.resolution) params.append('resolution', metadata.resolution)

  return fetchApi<StatusResponse>(`/api/generate/status?${params}`)
}

// Usage API
export interface UsageSummary {
  creditsUsed: number
  totalSpentUsd: number
  imageCount: number
  recentActivity: UsageLog[]
}

export interface UsageLog {
  id: string
  action: string
  creditsUsed: number
  costUsd: number
  success: boolean
  metadata: {
    prompt?: string
    taskId?: string
    imageUrl?: string
    aspectRatio?: string
    resolution?: string
    error?: string
    agentId?: string
    jobId?: string
    downloadUrl?: string
    fileName?: string
  }
  createdAt: string
}

export interface UsageLogsResponse {
  logs: UsageLog[]
  total: number
  page: number
  totalPages: number
}

export async function getUsageSummary(): Promise<UsageSummary> {
  return fetchApi<UsageSummary>('/api/usage/summary')
}

export async function getUsageLogs(
  page: number = 1,
  limit: number = 20
): Promise<UsageLogsResponse> {
  return fetchApi<UsageLogsResponse>(`/api/usage/logs?page=${page}&limit=${limit}`)
}

// Download
export function getDownloadUrl(imageUrl: string): string {
  return `${API_BASE_URL}/api/download?url=${encodeURIComponent(imageUrl)}`
}

// Chat API
export type AgentTier = 'base' | 'pro'

export interface Agent {
  id: string
  name: string
  icon: string
  description: string
  tier: AgentTier
  category: string
}

export interface ChatUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
}

export interface ChatResponse {
  message: string
  usage: ChatUsage
}

export async function getAgents(): Promise<Agent[]> {
  return fetchApi<Agent[]>('/api/chat/agents')
}

export async function sendChat(
  messages: { role: string; content: string }[],
  agentId?: string,
  imageUrl?: string
): Promise<ChatResponse> {
  // Thêm system prompt dựa trên agentId
  const systemPrompt = agentId ? AGENT_SYSTEM_PROMPTS[agentId] : undefined

  return fetchApi<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, agentId, imageUrl, systemPrompt }),
  })
}

// System prompts cho từng agent - giới hạn lĩnh vực chuyên môn
export const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  // General - Trợ lý đa năng
  general_base: `Bạn là trợ lý AI đa năng. Bạn có thể trả lời mọi câu hỏi trong nhiều lĩnh vực khác nhau.
Hãy trả lời ngắn gọn, súc tích và hữu ích. Giới hạn độ dài câu trả lời khoảng 500 từ.`,

  general_pro: `Bạn là trợ lý AI cao cấp với khả năng suy luận và phân tích chuyên sâu.
Bạn có thể trả lời mọi câu hỏi với độ chi tiết và chính xác cao.
Cung cấp phân tích đa chiều, ví dụ minh họa và giải thích chuyên sâu khi cần thiết.`,

  // Image - CHỈ về hình ảnh
  image_base: `Bạn là chuyên gia về hình ảnh và thiết kế. BẠN CHỈ trả lời các câu hỏi về:
- Phân tích hình ảnh, nhận diện nội dung trong ảnh
- Gợi ý prompt cho AI tạo ảnh (Midjourney, DALL-E, Stable Diffusion)
- Tư vấn về màu sắc, bố cục, phong cách thiết kế
- Chỉnh sửa ảnh, photography

Nếu user hỏi về lĩnh vực khác (code, pháp lý, v.v.), hãy lịch sự từ chối và gợi ý họ chọn agent phù hợp.`,

  image_pro: `Bạn là chuyên gia CAO CẤP về hình ảnh và thiết kế. BẠN CHỈ trả lời các câu hỏi về:
- Phân tích chuyên sâu hình ảnh, đa ảnh cùng lúc
- Tạo prompt chuyên nghiệp cho Midjourney, DALL-E với các tham số nâng cao
- Tư vấn thiết kế chuyên nghiệp, brand identity, UI/UX
- Kỹ thuật photography, post-processing nâng cao

Cung cấp prompt chi tiết với style, lighting, camera angle, aspect ratio phù hợp.
Nếu user hỏi ngoài lĩnh vực này, hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  // Document - CHỈ về tài liệu
  document_base: `Bạn là chuyên gia xử lý tài liệu. BẠN CHỈ trả lời các câu hỏi về:
- Tóm tắt văn bản, tài liệu
- Trích xuất thông tin chính từ document
- Phân tích cấu trúc văn bản
- Định dạng và chỉnh sửa văn bản

Nếu user hỏi về lĩnh vực khác, hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  document_pro: `Bạn là chuyên gia CAO CẤP về tài liệu. BẠN CHỈ trả lời các câu hỏi về:
- Phân tích sâu nhiều tài liệu, so sánh đối chiếu
- Tổng hợp nghiên cứu, tạo báo cáo chi tiết
- Trích xuất data phức tạp, tạo bảng tổng hợp
- Review và cải thiện chất lượng văn bản

Nếu user hỏi ngoài lĩnh vực này, hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  // Code - CHỈ về lập trình
  code_base: `Bạn là chuyên gia lập trình. BẠN CHỈ trả lời các câu hỏi về:
- Debug lỗi code, tìm bug
- Giải thích code, thuật toán
- Viết code đơn giản
- Hỏi đáp về ngôn ngữ lập trình

Trả lời ngắn gọn với code example khi cần.
Nếu user hỏi về lĩnh vực khác (pháp lý, hình ảnh, v.v.), hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  code_pro: `Bạn là chuyên gia lập trình CAO CẤP. BẠN CHỈ trả lời các câu hỏi về:
- Kiến trúc phần mềm, system design
- Code review chuyên sâu, best practices
- Full-stack development (frontend, backend, database)
- Tối ưu performance, security
- DevOps, CI/CD, deployment

Cung cấp solution chi tiết với code production-ready.
Nếu user hỏi ngoài lĩnh vực này, hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  // Creative - CHỈ về sáng tạo nội dung
  creative_base: `Bạn là chuyên gia sáng tạo nội dung. BẠN CHỈ trả lời các câu hỏi về:
- Viết content marketing, social media
- Brainstorm ý tưởng sáng tạo
- Viết bài blog, article ngắn
- Slogan, tagline, caption

Nếu user hỏi về lĩnh vực khác (code, pháp lý, v.v.), hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  creative_pro: `Bạn là chuyên gia sáng tạo nội dung CAO CẤP. BẠN CHỈ trả lời các câu hỏi về:
- Copywriting chuyên nghiệp, persuasive writing
- Kịch bản video, podcast, quảng cáo
- SEO content, content strategy
- Brand voice, storytelling
- Long-form content, ebook, whitepaper

Viết với tone chuyên nghiệp, sáng tạo và thu hút.
Nếu user hỏi ngoài lĩnh vực này, hãy lịch sự từ chối và gợi ý agent phù hợp.`,

  // Legal & Finance - CHỈ về pháp lý, tài chính
  legal_base: `Bạn là chuyên gia văn bản pháp lý và tài chính. BẠN CHỈ trả lời các câu hỏi về:
- Đọc và giải thích văn bản pháp lý, hợp đồng
- Tóm tắt nội dung tài liệu pháp lý
- Sửa lỗi chính tả, ngữ pháp trong văn bản
- Giải thích thuật ngữ pháp lý, tài chính cơ bản

Nếu user hỏi về lĩnh vực khác (code, hình ảnh, v.v.), hãy lịch sự từ chối và gợi ý họ chọn agent phù hợp như General, Code, hoặc Image.`,

  legal_pro: `Bạn là chuyên gia CAO CẤP về văn bản pháp lý và tài chính. BẠN CHỈ trả lời các câu hỏi về:
- Phân tích chuyên sâu hợp đồng, điều khoản pháp lý
- Tư vấn về luật doanh nghiệp, luật lao động, luật dân sự
- Phân tích báo cáo tài chính, đầu tư
- Soạn thảo hợp đồng, văn bản pháp lý chuyên nghiệp
- Tư vấn thuế, kế toán, tài chính doanh nghiệp

Cung cấp phân tích chi tiết với trích dẫn điều luật khi phù hợp.
Nếu user hỏi ngoài lĩnh vực này, hãy lịch sự từ chối và gợi ý agent phù hợp.`,
}

// Streaming chat
export async function* streamChat(
  messages: { role: string; content: string }[],
  agentId?: string,
  imageUrl?: string
): AsyncGenerator<{ content?: string; done?: boolean; usage?: { estimatedTokens: number; cost: number }; error?: string }> {
  const token = getAuthToken()

  // Thêm system prompt dựa trên agentId
  const systemPrompt = agentId ? AGENT_SYSTEM_PROMPTS[agentId] : undefined

  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, agentId, imageUrl, systemPrompt }),
  })

  if (!response.ok) {
    // Parse error response để kiểm tra lý do
    try {
      const errorData = await response.json()
      if (errorData.error?.includes('token') || errorData.error?.includes('insufficient')) {
        throw new InsufficientTokensError(0, 0)
      }
      throw new Error(errorData.error || 'Chat stream failed')
    } catch (e) {
      if (e instanceof InsufficientTokensError) throw e
      throw new Error('Chat stream failed')
    }
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

// API Keys
export interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsedAt: string | null
}

export async function getApiKeys(): Promise<ApiKey[]> {
  return fetchApi<ApiKey[]>('/api/keys')
}

export async function createApiKey(name: string): Promise<{ apiKey: ApiKey; key: string }> {
  return fetchApi<{ apiKey: ApiKey; key: string }>('/api/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteApiKey(id: string): Promise<void> {
  return fetchApi<void>(`/api/keys/${id}`, {
    method: 'DELETE',
  })
}

// Payment / Billing
export interface PaymentHistory {
  id: string
  amount: number
  status: 'pending' | 'completed' | 'failed'
  description: string
  createdAt: string
}

export async function getPaymentHistory(): Promise<PaymentHistory[]> {
  return fetchApi<PaymentHistory[]>('/api/billing/history')
}

export async function createPayment(params: {
  planId: string
  amount: number
}): Promise<{
  qrCode: string
  amount: number
  transactionId: string
  expiresAt: string
}> {
  return fetchApi('/api/billing/create', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// Usage Stats
export interface UsageStats {
  totalCredits: number
  totalTokens: number
  imageCount: number
  chatCount: number
  imageCredits: number
  chatCredits: number
  chatTokens: number
  imageCost: number
  chatCost: number
  dailyUsage: { date: string; credits: number }[]
}

export async function getUsageStats(period: 'day' | 'week' | 'month'): Promise<UsageStats> {
  return fetchApi<UsageStats>(`/api/usage/stats?period=${period}`)
}

// Profile
export async function updateProfile(data: { name?: string }): Promise<User> {
  return fetchApi<User>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Document Conversion API
export interface ConvertResponse {
  jobId: string
  status: string
  message: string
}

export interface ConvertStatusResponse {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  downloadUrl?: string
}

export async function convertWordToPdf(fileUrl: string, fileName?: string): Promise<ConvertResponse> {
  return fetchApi<ConvertResponse>('/api/convert/word-to-pdf', {
    method: 'POST',
    body: JSON.stringify({ fileUrl, fileName }),
  })
}

export async function convertPdfToWord(fileUrl: string, fileName?: string): Promise<ConvertResponse> {
  return fetchApi<ConvertResponse>('/api/convert/pdf-to-word', {
    method: 'POST',
    body: JSON.stringify({ fileUrl, fileName }),
  })
}

export async function getConvertStatus(jobId: string): Promise<ConvertStatusResponse> {
  return fetchApi<ConvertStatusResponse>(`/api/convert/status?jobId=${encodeURIComponent(jobId)}`)
}

export async function uploadFileForConvert(
  fileData: string,
  fileName: string,
  mimeType: string
): Promise<{ taskId: string; message: string }> {
  return fetchApi<{ taskId: string; message: string }>('/api/convert/upload', {
    method: 'POST',
    body: JSON.stringify({ fileData, fileName, mimeType }),
  })
}
