/**
 * Public Blog API
 */
import { apiClient } from './client'

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverImage: string | null
  blocks: BlockContent[]
  tags: string[] | null
  category: string | null
  seoMeta: SeoMeta | null
  isFeatured: boolean
  readingTime: number
  viewCount: number
  publishedAt: string | null
  createdAt: string
  author: { name: string | null } | null
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

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface BlogFilters {
  page?: number
  limit?: number
  tag?: string
  search?: string
}

/**
 * Get published blog posts (paginated)
 */
export async function getBlogPosts(filters: BlogFilters = {}): Promise<{
  posts: BlogPost[]
  pagination: PaginationInfo
}> {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.tag) params.set('tag', filters.tag)
  if (filters.search) params.set('search', filters.search)

  const query = params.toString()
  return apiClient.get(`/api/blog${query ? `?${query}` : ''}`)
}

/**
 * Get single blog post by slug
 */
export async function getBlogPostBySlug(slug: string, preview = false): Promise<BlogPost> {
  const query = preview ? '?preview=true' : ''
  return apiClient.get(`/api/blog/${slug}${query}`)
}

/**
 * Get featured blog posts
 */
export async function getFeaturedPosts(): Promise<{ posts: BlogPost[] }> {
  return apiClient.get('/api/blog/featured/list')
}
