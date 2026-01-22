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

export interface ConversationsResponse {
  conversations: Conversation[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Get list of user's conversations
 */
export async function getConversations(page = 1, limit = 20): Promise<ConversationsResponse> {
  return fetchApi<ConversationsResponse>(`/api/conversations?page=${page}&limit=${limit}`)
}

/**
 * Create a new conversation
 */
export async function createConversation(title?: string, agentId?: string): Promise<Conversation> {
  return fetchApi<Conversation>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, agentId }),
  })
}

/**
 * Get a conversation with its messages
 */
export async function getConversation(id: string): Promise<ConversationWithMessages> {
  return fetchApi<ConversationWithMessages>(`/api/conversations/${id}`)
}

/**
 * Update conversation title or agent
 */
export async function updateConversation(
  id: string,
  data: { title?: string; agentId?: string }
): Promise<Conversation> {
  return fetchApi<Conversation>(`/api/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/**
 * Delete a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  await fetchApi(`/api/conversations/${id}`, {
    method: 'DELETE',
  })
}
