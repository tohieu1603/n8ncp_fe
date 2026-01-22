'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, Eye, User } from 'lucide-react'
import { getBlogPostBySlug, type BlogPost, type BlockContent } from '@/lib/api'
import './blog-post.css'

function BlogPostContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const isPreview = searchParams.get('preview') === 'true'

  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const data = await getBlogPostBySlug(slug, isPreview)
        setPost(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchPost()
    }
  }, [slug, isPreview])

  if (loading) {
    return (
      <div className="blog-loading">
        <div className="blog-loading-spinner" />
        <p>Đang tải bài viết...</p>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="blog-error">
        <h1>Không tìm thấy bài viết</h1>
        <p>{error || 'Bài viết không tồn tại hoặc chưa được xuất bản.'}</p>
        <Link href="/blog" className="blog-back-link">
          <ArrowLeft size={18} />
          Quay lại danh sách bài viết
        </Link>
      </div>
    )
  }

  return (
    <div className="blog-post-page">
      {isPreview && (
        <div className="blog-preview-banner">
          Chế độ xem trước - Bài viết chưa được xuất bản
        </div>
      )}

      <article className="blog-article">
        {/* Header */}
        <header className="blog-header">
          <Link href="/blog" className="blog-back-link">
            <ArrowLeft size={18} />
            Quay lại
          </Link>

          {post.category && (
            <span className="blog-category">{post.category}</span>
          )}

          <h1 className="blog-title">{post.title}</h1>

          {post.excerpt && (
            <p className="blog-excerpt">{post.excerpt}</p>
          )}

          <div className="blog-meta">
            {post.author?.name && (
              <span className="blog-meta-item">
                <User size={16} />
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className="blog-meta-item">
                <Calendar size={16} />
                {new Date(post.publishedAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            <span className="blog-meta-item">
              <Clock size={16} />
              {post.readingTime} phút đọc
            </span>
            <span className="blog-meta-item">
              <Eye size={16} />
              {post.viewCount.toLocaleString()} lượt xem
            </span>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="blog-tags">
              {post.tags.map((tag) => (
                <span key={tag} className="blog-tag">{tag}</span>
              ))}
            </div>
          )}
        </header>

        {/* Cover Image */}
        {post.coverImage && (
          <div className="blog-cover">
            <img src={post.coverImage} alt={post.title} />
          </div>
        )}

        {/* Content */}
        <div className="blog-content">
          {post.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </article>
    </div>
  )
}

export default function BlogPostPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(139, 92, 246, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    }>
      <BlogPostContent />
    </Suspense>
  )
}

function BlockRenderer({ block }: { block: BlockContent }) {
  const renderHeading = (level: number, text: string) => {
    const className = `blog-heading blog-h${level}`
    switch (level) {
      case 1: return <h1 className={className}>{text}</h1>
      case 2: return <h2 className={className}>{text}</h2>
      case 3: return <h3 className={className}>{text}</h3>
      case 4: return <h4 className={className}>{text}</h4>
      case 5: return <h5 className={className}>{text}</h5>
      case 6: return <h6 className={className}>{text}</h6>
      default: return <h2 className={className}>{text}</h2>
    }
  }

  switch (block.type) {
    case 'text':
      return (
        <p className="blog-text">
          {String(block.data.text || '')}
        </p>
      )

    case 'heading': {
      const level = Number(block.data.level) || 2
      const text = String(block.data.text || '')
      return renderHeading(level, text)
    }

    case 'image': {
      const caption = block.data.caption ? String(block.data.caption) : null
      return (
        <figure className="blog-figure">
          <img
            src={String(block.data.url || '')}
            alt={caption || ''}
          />
          {caption && (
            <figcaption>{caption}</figcaption>
          )}
        </figure>
      )
    }

    case 'code':
      return (
        <pre className="blog-code">
          <code className={`language-${block.data.language || 'text'}`}>
            {String(block.data.code || '')}
          </code>
        </pre>
      )

    case 'quote': {
      const author = block.data.author ? String(block.data.author) : null
      return (
        <blockquote className="blog-quote">
          <p>{String(block.data.text || '')}</p>
          {author && (
            <cite>— {author}</cite>
          )}
        </blockquote>
      )
    }

    case 'list': {
      const items = (block.data.items as string[]) || []
      if (block.data.style === 'ordered') {
        return (
          <ol className="blog-list">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        )
      }
      return (
        <ul className="blog-list">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )
    }

    case 'divider':
      return <hr className="blog-divider" />

    default:
      return null
  }
}
