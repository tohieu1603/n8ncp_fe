import { apiClient } from './client'

// ==================== TYPES ====================

export type UserRole = 'user' | 'admin'
export type PostStatus = 'draft' | 'published' | 'archived'

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  creditsUsed: number
  tokenBalance: number
  isPro: boolean
  proExpiresAt: string | null
  isActive: boolean
  isEmailVerified: boolean
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface BlockContent {
  id: string
  type: 'text' | 'heading' | 'image' | 'code' | 'quote' | 'list' | 'divider'
  data: Record<string, unknown>
}

export interface SeoMeta {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  ogImage?: string
  canonicalUrl?: string
  noIndex?: boolean
  noFollow?: boolean
}

export interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  blocks: BlockContent[]
  status: PostStatus
  tags: string[] | null
  category: string | null
  seoMeta: SeoMeta | null
  isFeatured: boolean
  readingTime: number
  viewCount: number
  authorId: string
  author: { id: string; name: string | null; email: string } | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UserFilters {
  role?: UserRole
  isActive?: boolean
  isPro?: boolean
  isEmailVerified?: boolean
  search?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'name' | 'creditsUsed'
  sortOrder?: 'ASC' | 'DESC'
}

export interface PostFilters {
  status?: PostStatus
  authorId?: string
  tag?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'title'
  sortOrder?: 'ASC' | 'DESC'
}

export interface UserStats {
  total: number
  active: number
  pro: number
  verified: number
  admins: number
}

// ==================== USER API ====================

export async function getUsers(filters: UserFilters = {}): Promise<{
  users: AdminUser[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams()
  if (filters.role) params.set('role', filters.role)
  if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive))
  if (filters.isPro !== undefined) params.set('isPro', String(filters.isPro))
  if (filters.isEmailVerified !== undefined) params.set('isEmailVerified', String(filters.isEmailVerified))
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const query = params.toString()
  return apiClient.get(`/api/admin/users${query ? `?${query}` : ''}`)
}

export async function getUserById(id: string): Promise<AdminUser> {
  return apiClient.get(`/api/admin/users/${id}`)
}

export async function updateUserRole(id: string, role: UserRole): Promise<AdminUser> {
  return apiClient.patch(`/api/admin/users/${id}/role`, { role })
}

export async function toggleUserStatus(id: string, isActive: boolean): Promise<AdminUser> {
  return apiClient.patch(`/api/admin/users/${id}/status`, { isActive })
}

export async function getUserStats(): Promise<UserStats> {
  return apiClient.get('/api/admin/users/stats')
}

// ==================== POST API ====================

export async function getPosts(filters: PostFilters = {}): Promise<{
  posts: Post[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.authorId) params.set('authorId', filters.authorId)
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.search) params.set('search', filters.search)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)

  const query = params.toString()
  return apiClient.get(`/api/admin/posts${query ? `?${query}` : ''}`)
}

export async function getPostById(id: string): Promise<Post> {
  return apiClient.get(`/api/admin/posts/${id}`)
}

export interface CreatePostData {
  title: string
  slug?: string
  excerpt?: string
  coverImage?: string
  blocks?: BlockContent[]
  tags?: string[]
  category?: string
  seoMeta?: SeoMeta
  isFeatured?: boolean
  status?: PostStatus
}

export async function createPost(data: CreatePostData): Promise<Post> {
  return apiClient.post('/api/admin/posts', data)
}

export interface UpdatePostData {
  title?: string
  slug?: string
  excerpt?: string
  coverImage?: string
  blocks?: BlockContent[]
  tags?: string[]
  category?: string
  seoMeta?: SeoMeta
  isFeatured?: boolean
  status?: PostStatus
}

export async function updatePost(id: string, data: UpdatePostData): Promise<Post> {
  return apiClient.put(`/api/admin/posts/${id}`, data)
}

export async function deletePost(id: string): Promise<void> {
  return apiClient.delete(`/api/admin/posts/${id}`)
}

export async function publishPost(id: string): Promise<Post> {
  return apiClient.post(`/api/admin/posts/${id}/publish`, {})
}

export async function unpublishPost(id: string): Promise<Post> {
  return apiClient.post(`/api/admin/posts/${id}/unpublish`, {})
}
