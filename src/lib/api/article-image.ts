/**
 * Article Image API
 * Generate images from article content chunks
 */

import { fetchApi } from './client'

export type ArticleImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

export interface ArticleImageInput {
  prompt: string
  aspect_ratio?: ArticleImageAspectRatio
}

export interface CreateArticleImageResponse {
  taskId: string
  message: string
}

export interface CreateBatchResponse {
  taskIds: string[]
  errors: { index: number; error: string }[]
  message: string
}

export interface ArticleImageStatus {
  taskId: string
  status: 'processing' | 'completed' | 'failed' | 'invalid' | 'error'
  output?: { media_url?: string }
  error?: string
}

export interface BatchStatusResponse {
  results: ArticleImageStatus[]
}

/**
 * Create a single article image from prompt
 */
export async function createArticleImage(
  prompt: string,
  aspect_ratio: ArticleImageAspectRatio = '16:9'
): Promise<CreateArticleImageResponse> {
  return fetchApi<CreateArticleImageResponse>('/api/article-images', {
    method: 'POST',
    body: JSON.stringify({ prompt, aspect_ratio }),
  })
}

/**
 * Create batch article images from multiple prompts
 */
export async function createArticleImageBatch(
  images: ArticleImageInput[]
): Promise<CreateBatchResponse> {
  return fetchApi<CreateBatchResponse>('/api/article-images/batch', {
    method: 'POST',
    body: JSON.stringify({ images }),
  })
}

/**
 * Get status of a single article image task
 */
export async function getArticleImageStatus(taskId: string): Promise<ArticleImageStatus> {
  return fetchApi<ArticleImageStatus>(`/api/article-images/status?taskId=${encodeURIComponent(taskId)}`)
}

/**
 * Get status of multiple article image tasks
 */
export async function getArticleImageBatchStatus(taskIds: string[]): Promise<BatchStatusResponse> {
  return fetchApi<BatchStatusResponse>('/api/article-images/status/batch', {
    method: 'POST',
    body: JSON.stringify({ taskIds }),
  })
}

/**
 * Poll for article image completion
 */
export async function pollArticleImageStatus(
  taskId: string,
  onProgress?: (status: ArticleImageStatus) => void,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<ArticleImageStatus> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const status = await getArticleImageStatus(taskId)
    onProgress?.(status)

    if (status.status === 'completed' || status.status === 'failed') {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    attempts++
  }

  return { taskId, status: 'failed', error: 'Timeout waiting for image generation' }
}

/**
 * Poll for batch article images completion
 */
export async function pollBatchArticleImageStatus(
  taskIds: string[],
  onProgress?: (results: ArticleImageStatus[]) => void,
  maxAttempts = 60,
  intervalMs = 3000
): Promise<ArticleImageStatus[]> {
  let attempts = 0
  const completedResults: Map<string, ArticleImageStatus> = new Map()

  while (attempts < maxAttempts) {
    const pendingIds = taskIds.filter((id) => {
      const existing = completedResults.get(id)
      return !existing || existing.status === 'processing'
    })

    if (pendingIds.length === 0) {
      break
    }

    const { results } = await getArticleImageBatchStatus(pendingIds)

    for (const result of results) {
      completedResults.set(result.taskId, result)
    }

    const allResults = taskIds.map((id) => completedResults.get(id)!)
    onProgress?.(allResults)

    const allDone = allResults.every(
      (r) => r.status === 'completed' || r.status === 'failed'
    )
    if (allDone) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    attempts++
  }

  return taskIds.map(
    (id) =>
      completedResults.get(id) || {
        taskId: id,
        status: 'failed' as const,
        error: 'Timeout',
      }
  )
}
