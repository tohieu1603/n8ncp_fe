/**
 * Usage API
 */

import { fetchApi } from './client'

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

export interface UsageSummary {
  creditsUsed: number
  totalSpentUsd: number
  imageCount: number
  recentActivity: UsageLog[]
}

export interface UsageLogsResponse {
  logs: UsageLog[]
  total: number
  page: number
  totalPages: number
}

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

export async function getUsageSummary(): Promise<UsageSummary> {
  return fetchApi<UsageSummary>('/api/usage/summary')
}

export async function getUsageLogs(
  page: number = 1,
  limit: number = 20
): Promise<UsageLogsResponse> {
  return fetchApi<UsageLogsResponse>(`/api/usage/logs?page=${page}&limit=${limit}`)
}

export async function getUsageStats(period: 'day' | 'week' | 'month'): Promise<UsageStats> {
  return fetchApi<UsageStats>(`/api/usage/stats?period=${period}`)
}
