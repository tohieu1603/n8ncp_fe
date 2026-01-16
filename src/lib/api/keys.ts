/**
 * API Keys Management
 */

import { fetchApi } from './client'

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
