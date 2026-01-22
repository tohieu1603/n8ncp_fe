/**
 * Chat API
 * System prompts are now managed by backend (agents/configs/*.yaml)
 */

import { fetchApi, getAuthToken, getApiBaseUrl, InsufficientTokensError } from './client'

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
  conversationId?: string
}

export interface WorkflowCreateResponse {
  success: boolean
  workflowId?: string
  workflowUrl?: string
  error?: string
}

export async function getAgents(): Promise<Agent[]> {
  return fetchApi<Agent[]>('/api/chat/agents')
}

export async function sendChat(
  messages: { role: string; content: string }[],
<<<<<<< HEAD
=======
  agentId?: string,
>>>>>>> d49635003a6332ce2a257df3fc3104b94d355317
  imageUrl?: string,
  conversationId?: string
): Promise<ChatResponse> {
  return fetchApi<ChatResponse>('/api/chat', {
    method: 'POST',
<<<<<<< HEAD
    body: JSON.stringify({ messages, imageUrl, conversationId }),
=======
    body: JSON.stringify({ messages, agentId, imageUrl, systemPrompt, conversationId }),
>>>>>>> d49635003a6332ce2a257df3fc3104b94d355317
  })
}

export async function* streamChat(
  messages: { role: string; content: string }[],
<<<<<<< HEAD
  imageUrl?: string,
  conversationId?: string
): AsyncGenerator<{ content?: string; done?: boolean; conversationId?: string; usage?: { estimatedTokens: number; cost: number }; error?: string }> {
=======
  agentId?: string,
  imageUrl?: string,
  conversationId?: string
): AsyncGenerator<{ content?: string; done?: boolean; usage?: { estimatedTokens: number; cost: number }; error?: string }> {
>>>>>>> d49635003a6332ce2a257df3fc3104b94d355317
  const token = getAuthToken()

  const response = await fetch(`${getApiBaseUrl()}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
<<<<<<< HEAD
    body: JSON.stringify({ messages, imageUrl, conversationId }),
=======
    body: JSON.stringify({ messages, agentId, imageUrl, systemPrompt, conversationId }),
>>>>>>> d49635003a6332ce2a257df3fc3104b94d355317
  })

  if (!response.ok) {
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

/**
 * Create a workflow in n8n from JSON
 * Note: This endpoint returns response directly (not wrapped in { success, data })
 */
export async function createWorkflow(workflowJson: object): Promise<WorkflowCreateResponse> {
  const token = getAuthToken()

  const response = await fetch(`${getApiBaseUrl()}/api/workflow/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ workflow: workflowJson }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to create workflow' }))
    return {
      success: false,
      error: errorData.error || errorData.detail || 'Failed to create workflow',
    }
  }

  // Response is returned directly from Django Ninja schema
  const data = await response.json()
  return data as WorkflowCreateResponse
}
