/**
 * Conversations API
 */

import { fetchApi } from './client'

export interface Conversation {
  id: string
  title: string
  agentId: string
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
  tokensUsed?: number
  createdAt: string
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[]
}

/**
 * Get list of user's conversations
 */
export async function getConversations(limit = 50, offset = 0): Promise<Conversation[]> {
  return fetchApi<Conversation[]>(`/api/chat/conversations?limit=${limit}&offset=${offset}`)
}

/**
 * Create a new conversation
 */
export async function createConversation(title?: string, agentId?: string): Promise<Conversation> {
  return fetchApi<Conversation>('/api/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, agentId }),
  })
}

/**
 * Get a conversation with its messages
 */
export async function getConversation(id: string): Promise<ConversationWithMessages> {
  return fetchApi<ConversationWithMessages>(`/api/chat/conversations/${id}`)
}

/**
 * Update conversation title or agent
 */
export async function updateConversation(
  id: string,
  data: { title?: string; agentId?: string }
): Promise<Conversation> {
  return fetchApi<Conversation>(`/api/chat/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  await fetchApi(`/api/chat/conversations/${id}`, {
    method: 'DELETE',
  })
}
