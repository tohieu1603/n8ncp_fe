/**
 * API Module - Re-exports all API functions
 */

// Client utilities
export {
  setAuthToken,
  getAuthToken,
  clearAuth,
  fetchApi,
  getApiBaseUrl,
  InsufficientTokensError,
  AuthenticationError,
  ForbiddenError,
} from './client'

// Auth
export {
  login,
  register,
  verifyEmail,
  resendVerification,
  loginWithGoogle,
  getGoogleAuthUrl,
  getMe,
  updateProfile,
  deactivateAccount,
  hasEnoughTokens,
  getRemainingTokens,
} from './auth'
export type { User, AuthData, RegisterResponse } from './auth'

// Generate
export { generateImage, getTaskStatus, getDownloadUrl } from './generate'
export type { GenerateResponse, StatusResponse } from './generate'

// Chat
export { getAgents, sendChat, streamChat, createWorkflow } from './chat'
export type { Agent, AgentTier, ChatUsage, ChatResponse, WorkflowCreateResponse } from './chat'

// Billing
export { getPaymentHistory, createPayment, checkPaymentStatus } from './billing'
export type { PaymentHistory, CreatePaymentResponse } from './billing'

// Usage
export { getUsageSummary, getUsageLogs, getUsageStats } from './usage'
export type { UsageLog, UsageSummary, UsageLogsResponse, UsageStats } from './usage'

// Keys
export { getApiKeys, createApiKey, deleteApiKey } from './keys'
export type { ApiKey } from './keys'

// Convert
export {
  convertWordToPdf,
  convertPdfToWord,
  getConvertStatus,
  uploadFileForConvert,
} from './convert'
export type { ConvertResponse, ConvertStatusResponse } from './convert'

// Admin
export {
  getUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  getUserStats,
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  publishPost,
  unpublishPost,
} from './admin'
export type {
  UserRole,
  PostStatus,
  AdminUser,
  BlockContent,
  SeoMeta,
  Post,
  PaginationInfo,
  UserFilters,
  PostFilters,
  UserStats,
  CreatePostData,
  UpdatePostData,
} from './admin'

// Article Image
export {
  createArticleImage,
  createArticleImageBatch,
  getArticleImageStatus,
  getArticleImageBatchStatus,
  pollArticleImageStatus,
  pollBatchArticleImageStatus,
} from './article-image'
export type {
  ArticleImageAspectRatio,
  ArticleImageInput,
  CreateArticleImageResponse,
  CreateBatchResponse,
  ArticleImageStatus,
  BatchStatusResponse,
} from './article-image'

// Blog (Public)
export { getBlogPosts, getBlogPostBySlug, getFeaturedPosts } from './blog'
export type { BlogPost, BlogFilters } from './blog'
