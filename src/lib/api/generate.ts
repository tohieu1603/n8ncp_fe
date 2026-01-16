/**
 * Image Generation API
 */

import { fetchApi, getApiBaseUrl } from './client'

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

export function getDownloadUrl(imageUrl: string): string {
  return `${getApiBaseUrl()}/api/download?url=${encodeURIComponent(imageUrl)}`
}
