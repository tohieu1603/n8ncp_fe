import type { CreateTaskRequest, CreateTaskResponse, TaskStatusResponse } from '@/types/kie-api'

const KIE_API_BASE_URL = 'https://api.kie.ai/api/v1/jobs'
const KIE_API_KEY = process.env.KIE_API_KEY || ''

export async function createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
  const response = await fetch(`${KIE_API_BASE_URL}/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.msg || `API request failed: ${response.status}`)
  }

  return response.json()
}

export async function getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
  const response = await fetch(`${KIE_API_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${KIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
