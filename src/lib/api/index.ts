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
export { getAgents, sendChat, streamChat, AGENT_SYSTEM_PROMPTS } from './chat'
export type { Agent, AgentTier, ChatUsage, ChatResponse } from './chat'

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
