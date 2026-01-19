'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  Input,
  Button,
  Space,
  Select,
  message,
  Form,
  Collapse,
  Switch,
  Tabs,
  Divider,
  Spin,
  Image,
  Row,
  Col,
} from 'antd'
import {
  SaveOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  RobotOutlined,
  SettingOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  createPost,
  createArticleImageBatch,
  pollBatchArticleImageStatus,
  streamChat,
  type BlockContent,
  type PostStatus,
  type SeoMeta,
  type ArticleImageInput,
} from '@/lib/api'

const CATEGORIES = [
  'Technology',
  'Business',
  'Lifestyle',
  'Health',
  'Education',
  'Entertainment',
  'Travel',
  'Food',
  'Sports',
  'Other',
]

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Calculate reading time from blocks
function calculateReadingTime(blocks: BlockContent[]): number {
  let wordCount = 0
  for (const block of blocks) {
    if (block.type === 'text' || block.type === 'heading' || block.type === 'quote') {
      const text = String(block.data.text || block.data.content || '')
      wordCount += text.split(/\s+/).filter(Boolean).length
    }
    if (block.type === 'list') {
      const items = block.data.items as string[] || []
      wordCount += items.join(' ').split(/\s+/).filter(Boolean).length
    }
  }
  return Math.max(1, Math.ceil(wordCount / 200))
}

// Parse pasted content into blocks
function parseContentToBlocks(html: string): BlockContent[] {
  const blocks: BlockContent[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'text',
          data: { text },
        })
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as Element
    const tagName = el.tagName.toLowerCase()

    switch (tagName) {
      case 'h1':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'heading',
          data: { text: el.textContent?.trim() || '', level: 1 },
        })
        break
      case 'h2':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'heading',
          data: { text: el.textContent?.trim() || '', level: 2 },
        })
        break
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'heading',
          data: { text: el.textContent?.trim() || '', level: parseInt(tagName[1]) },
        })
        break
      case 'p':
        const text = el.textContent?.trim()
        if (text) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'text',
            data: { text },
          })
        }
        break
      case 'ul':
      case 'ol':
        const items: string[] = []
        el.querySelectorAll('li').forEach(li => {
          const itemText = li.textContent?.trim()
          if (itemText) items.push(itemText)
        })
        if (items.length > 0) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'list',
            data: { items, style: tagName === 'ol' ? 'ordered' : 'unordered' },
          })
        }
        break
      case 'blockquote':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'quote',
          data: { text: el.textContent?.trim() || '' },
        })
        break
      case 'pre':
      case 'code':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'code',
          data: { code: el.textContent?.trim() || '', language: 'plaintext' },
        })
        break
      case 'img':
        const src = (el as HTMLImageElement).src
        if (src) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'image',
            data: { url: src, caption: (el as HTMLImageElement).alt || '' },
          })
        }
        break
      case 'hr':
        blocks.push({
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'divider',
          data: {},
        })
        break
      case 'div':
      case 'section':
      case 'article':
      case 'body':
        el.childNodes.forEach(processNode)
        break
      default:
        // For other elements, try to get text content
        if (el.textContent?.trim()) {
          el.childNodes.forEach(processNode)
        }
    }
  }

  doc.body.childNodes.forEach(processNode)

  // If no blocks were created but there's text, treat it as plain text paragraphs
  if (blocks.length === 0) {
    const plainText = doc.body.textContent || ''
    const paragraphs = plainText.split(/\n\n+/)
    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (trimmed) {
        // Check if it looks like a heading
        if (trimmed.startsWith('# ')) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'heading',
            data: { text: trimmed.slice(2), level: 1 },
          })
        } else if (trimmed.startsWith('## ')) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'heading',
            data: { text: trimmed.slice(3), level: 2 },
          })
        } else if (trimmed.startsWith('### ')) {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'heading',
            data: { text: trimmed.slice(4), level: 3 },
          })
        } else {
          blocks.push({
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'text',
            data: { text: trimmed },
          })
        }
      }
    }
  }

  return blocks
}

// Get all text content from blocks for AI
function getBlocksTextContent(blocks: BlockContent[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'text':
      case 'heading':
      case 'quote':
        return String(block.data.text || block.data.content || '')
      case 'list':
        return (block.data.items as string[] || []).join('\n')
      case 'code':
        return String(block.data.code || '')
      default:
        return ''
    }
  }).filter(Boolean).join('\n\n')
}

interface GeneratedImage {
  prompt: string
  aspect_ratio: string
  description: string
  taskId?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

export default function NewPostPage() {
  const router = useRouter()
  const [form] = Form.useForm()
  const [blocks, setBlocks] = useState<BlockContent[]>([])
  const [loading, setLoading] = useState(false)
  const [seoMeta, setSeoMeta] = useState<SeoMeta>({})
  const [autoSlug, setAutoSlug] = useState(true)

  // AI Image Generation state
  const [generatingImages, setGeneratingImages] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [aiProgress, setAiProgress] = useState('')

  // Handle paste in content area
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const html = e.clipboardData.getData('text/html')
    const text = e.clipboardData.getData('text/plain')

    const newBlocks = parseContentToBlocks(html || `<p>${text}</p>`)
    if (newBlocks.length > 0) {
      setBlocks(prev => [...prev, ...newBlocks])
      message.success(`Added ${newBlocks.length} content blocks`)

      // Auto-set title from first heading if empty
      const firstHeading = newBlocks.find(b => b.type === 'heading')
      const currentTitle = form.getFieldValue('title')
      if (firstHeading && !currentTitle) {
        const title = String(firstHeading.data.text || '')
        form.setFieldValue('title', title)
        if (autoSlug) {
          form.setFieldValue('slug', generateSlug(title))
        }
      }
    }
  }, [form, autoSlug])

  // Handle title change for auto slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    if (autoSlug) {
      form.setFieldValue('slug', generateSlug(title))
    }
  }

  // Generate AI images from content
  const handleGenerateImages = async () => {
    const content = getBlocksTextContent(blocks)
    if (!content.trim()) {
      message.error('No content to generate images from')
      return
    }

    setGeneratingImages(true)
    setAiProgress('Analyzing article content...')
    setGeneratedImages([])

    try {
      // Step 1: Get prompts from AI
      let fullResponse = ''
      const chatHistory = [{ role: 'user', content }]

      for await (const chunk of streamChat(chatHistory, 'article_image')) {
        if (chunk.content) {
          fullResponse += chunk.content
        }
      }

      // Parse JSON response
      setAiProgress('Processing AI suggestions...')
      let jsonContent = fullResponse
      const jsonMatch = fullResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }

      const parsed = JSON.parse(jsonContent.trim())
      if (!parsed.images || parsed.images.length === 0) {
        throw new Error('No image suggestions from AI')
      }

      // Normalize aspect ratio
      const normalizeAspectRatio = (ar: string): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' => {
        const valid = ['1:1', '16:9', '9:16', '4:3', '3:4']
        return valid.includes(ar) ? ar as any : '16:9'
      }

      // Step 2: Create image tasks (z-image only uses prompt + aspect_ratio)
      const images: GeneratedImage[] = parsed.images.map((img: any) => ({
        prompt: img.prompt,
        aspect_ratio: normalizeAspectRatio(img.aspect_ratio),
        description: img.description || '',
        status: 'pending' as const,
      }))

      setGeneratedImages(images)
      setAiProgress(`Generating ${images.length} images...`)

      // Step 3: Create batch
      const batchInput: ArticleImageInput[] = images.map(img => ({
        prompt: img.prompt,
        aspect_ratio: img.aspect_ratio as any,
      }))

      const batchResult = await createArticleImageBatch(batchInput)

      // Update with taskIds
      const updatedImages = images.map((img, idx) => ({
        ...img,
        taskId: batchResult.taskIds[idx],
        status: batchResult.errors.find(e => e.index === idx) ? 'failed' as const : 'generating' as const,
        error: batchResult.errors.find(e => e.index === idx)?.error,
      }))

      setGeneratedImages(updatedImages)

      // Step 4: Poll for results
      if (batchResult.taskIds.length > 0) {
        const results = await pollBatchArticleImageStatus(
          batchResult.taskIds,
          (statusResults) => {
            setGeneratedImages(prev => prev.map(img => {
              const status = statusResults.find(s => s.taskId === img.taskId)
              if (!status) return img
              return {
                ...img,
                status: status.status === 'completed' ? 'completed' : status.status === 'failed' ? 'failed' : 'generating',
                imageUrl: status.output?.media_url,
                error: status.error,
              }
            }))
          }
        )

        // Final update
        setGeneratedImages(prev => prev.map(img => {
          const status = results.find(s => s.taskId === img.taskId)
          if (!status) return img
          return {
            ...img,
            status: status.status === 'completed' ? 'completed' : 'failed',
            imageUrl: status.output?.media_url,
            error: status.error,
          }
        }))
      }

      setAiProgress('')
      message.success('Images generated!')
    } catch (error) {
      console.error('AI image generation error:', error)
      message.error(error instanceof Error ? error.message : 'Failed to generate images')
      setAiProgress('')
    } finally {
      setGeneratingImages(false)
    }
  }

  // Add generated image to blocks
  const addImageToBlocks = (imageUrl: string, caption: string) => {
    setBlocks(prev => [...prev, {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: 'image',
      data: { url: imageUrl, caption },
    }])
    message.success('Image added to content')
  }

  // Set as cover image
  const setAsCoverImage = (imageUrl: string) => {
    form.setFieldValue('coverImage', imageUrl)
    setSeoMeta(prev => ({ ...prev, ogImage: imageUrl }))
    message.success('Set as cover image')
  }

  const handleSave = async (status: PostStatus = 'draft') => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const readingTime = calculateReadingTime(blocks)

      await createPost({
        title: values.title,
        slug: values.slug || generateSlug(values.title),
        excerpt: values.excerpt,
        coverImage: values.coverImage,
        tags: values.tags,
        category: values.category,
        blocks,
        status,
        seoMeta: Object.keys(seoMeta).length > 0 ? seoMeta : undefined,
        isFeatured: values.isFeatured || false,
      })

      message.success(status === 'published' ? 'Post published!' : 'Post saved as draft')
      router.push('/admin/posts')
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('Please fill in required fields')
      } else {
        message.error('Failed to save post')
      }
    } finally {
      setLoading(false)
    }
  }

  // Block editor inline
  const renderBlock = (block: BlockContent, index: number) => {
    const updateBlock = (data: Record<string, unknown>) => {
      setBlocks(prev => prev.map((b, i) => i === index ? { ...b, data: { ...b.data, ...data } } : b))
    }

    const removeBlock = () => {
      setBlocks(prev => prev.filter((_, i) => i !== index))
    }

    const moveBlock = (direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= blocks.length) return
      setBlocks(prev => {
        const newBlocks = [...prev]
        ;[newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]]
        return newBlocks
      })
    }

    return (
      <div key={block.id} style={{
        padding: 12,
        marginBottom: 8,
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Select
            value={block.type}
            size="small"
            style={{ width: 120 }}
            onChange={(type) => setBlocks(prev => prev.map((b, i) => i === index ? { ...b, type } : b))}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'heading', label: 'Heading' },
              { value: 'image', label: 'Image' },
              { value: 'quote', label: 'Quote' },
              { value: 'list', label: 'List' },
              { value: 'code', label: 'Code' },
              { value: 'divider', label: 'Divider' },
            ]}
          />
          <Space size={4}>
            <Button size="small" onClick={() => moveBlock('up')} disabled={index === 0}>↑</Button>
            <Button size="small" onClick={() => moveBlock('down')} disabled={index === blocks.length - 1}>↓</Button>
            <Button size="small" danger onClick={removeBlock}>×</Button>
          </Space>
        </div>

        {block.type === 'text' && (
          <Input.TextArea
            value={String(block.data.text || '')}
            onChange={(e) => updateBlock({ text: e.target.value })}
            placeholder="Enter text..."
            autoSize={{ minRows: 2 }}
          />
        )}

        {block.type === 'heading' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={Number(block.data.level) || 2}
              size="small"
              style={{ width: 100 }}
              onChange={(level) => updateBlock({ level })}
              options={[
                { value: 1, label: 'H1' },
                { value: 2, label: 'H2' },
                { value: 3, label: 'H3' },
                { value: 4, label: 'H4' },
              ]}
            />
            <Input
              value={String(block.data.text || '')}
              onChange={(e) => updateBlock({ text: e.target.value })}
              placeholder="Heading text..."
              style={{ fontWeight: 600, fontSize: Number(block.data.level) === 1 ? 24 : Number(block.data.level) === 2 ? 20 : 16 }}
            />
          </Space>
        )}

        {block.type === 'image' && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={String(block.data.url || '')}
              onChange={(e) => updateBlock({ url: e.target.value })}
              placeholder="Image URL..."
            />
            {block.data.url ? (
              <Image src={String(block.data.url)} alt="" style={{ maxHeight: 200, objectFit: 'contain' }} />
            ) : null}
            <Input
              value={String(block.data.caption || '')}
              onChange={(e) => updateBlock({ caption: e.target.value })}
              placeholder="Caption (optional)..."
            />
          </Space>
        )}

        {block.type === 'quote' && (
          <Input.TextArea
            value={String(block.data.text || '')}
            onChange={(e) => updateBlock({ text: e.target.value })}
            placeholder="Quote text..."
            style={{ fontStyle: 'italic', borderLeft: '3px solid #8b5cf6', paddingLeft: 12 }}
          />
        )}

        {block.type === 'list' && (
          <Input.TextArea
            value={(block.data.items as string[] || []).join('\n')}
            onChange={(e) => updateBlock({ items: e.target.value.split('\n').filter(Boolean) })}
            placeholder="List items (one per line)..."
            autoSize={{ minRows: 3 }}
          />
        )}

        {block.type === 'code' && (
          <Input.TextArea
            value={String(block.data.code || '')}
            onChange={(e) => updateBlock({ code: e.target.value })}
            placeholder="Code..."
            style={{ fontFamily: 'monospace' }}
            autoSize={{ minRows: 3 }}
          />
        )}

        {block.type === 'divider' && (
          <Divider style={{ margin: '8px 0' }} />
        )}
      </div>
    )
  }

  const addBlock = (type: BlockContent['type']) => {
    setBlocks(prev => [...prev, {
      id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      data: type === 'list' ? { items: [], style: 'unordered' } : {},
    }])
  }

  return (
    <div style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 24 }}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/posts')}>
            Back
          </Button>
          <Space>
            <Button icon={<SaveOutlined />} loading={loading} onClick={() => handleSave('draft')}>
              Save Draft
            </Button>
            <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={() => handleSave('published')}>
              Publish
            </Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={16}>
        {/* Main Content */}
        <Col xs={24} lg={16}>
          {/* Basic Info */}
          <Card title="Post Details" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
                <Input placeholder="Enter post title" size="large" onChange={handleTitleChange} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="slug" label="Slug">
                    <Input placeholder="post-url-slug" addonBefore="/" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Auto Slug">
                    <Switch checked={autoSlug} onChange={setAutoSlug} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="excerpt" label="Excerpt">
                <Input.TextArea placeholder="Brief description of the post" rows={2} />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="category" label="Category">
                    <Select placeholder="Select category" allowClear options={CATEGORIES.map(c => ({ value: c, label: c }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tags" label="Tags">
                    <Select mode="tags" placeholder="Add tags" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item name="coverImage" label="Cover Image URL">
                    <Input placeholder="https://example.com/image.jpg" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="isFeatured" label="Featured" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Content Editor */}
          <Card
            title="Content"
            extra={
              <Space>
                {blocks.length > 0 && (
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    onClick={handleGenerateImages}
                    loading={generatingImages}
                  >
                    🎨 AI Gen Images
                  </Button>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            {/* Paste Zone */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                color: 'rgba(255,255,255,0.7)'
              }}>
                <PictureOutlined />
                <span style={{ fontWeight: 500 }}>Quick Import - Paste content below</span>
              </div>
              <Input.TextArea
                placeholder="Paste your article here... (supports HTML, Markdown headings like # H1, ## H2, or plain text paragraphs)"
                onPaste={handlePaste}
                rows={4}
                style={{
                  background: 'rgba(139,92,246,0.05)',
                  border: '2px dashed rgba(139,92,246,0.3)',
                }}
              />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                ✨ Auto-detects: H1-H6, paragraphs, lists, quotes, code blocks, images
              </p>
            </div>

            <Divider style={{ margin: '12px 0' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {blocks.length > 0 ? `${blocks.length} blocks` : 'Content blocks'}
              </span>
            </Divider>

            {/* Blocks */}
            <div style={{ marginBottom: 16 }}>
              {blocks.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '24px 0' }}>
                  <p style={{ marginBottom: 8 }}>No content yet</p>
                  <p style={{ fontSize: 12 }}>Paste above or add blocks manually below</p>
                </div>
              ) : (
                blocks.map((block, index) => renderBlock(block, index))
              )}
            </div>

            {/* Add Block Buttons */}
            <Space wrap>
              <Button size="small" onClick={() => addBlock('text')}>+ Text</Button>
              <Button size="small" onClick={() => addBlock('heading')}>+ Heading</Button>
              <Button size="small" onClick={() => addBlock('image')}>+ Image</Button>
              <Button size="small" onClick={() => addBlock('quote')}>+ Quote</Button>
              <Button size="small" onClick={() => addBlock('list')}>+ List</Button>
              <Button size="small" onClick={() => addBlock('code')}>+ Code</Button>
              <Button size="small" onClick={() => addBlock('divider')}>+ Divider</Button>
              {blocks.length > 0 && (
                <Button size="small" danger onClick={() => setBlocks([])}>Clear All</Button>
              )}
            </Space>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          {/* AI Generated Images */}
          {(generatedImages.length > 0 || generatingImages) && (
            <Card title="AI Generated Images" style={{ marginBottom: 16 }}>
              {aiProgress && (
                <div style={{ textAlign: 'center', padding: 16, color: '#a78bfa' }}>
                  <Spin style={{ marginRight: 8 }} />
                  {aiProgress}
                </div>
              )}

              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {generatedImages.map((img, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                    {img.status === 'generating' && (
                      <div style={{ aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                        <Spin />
                      </div>
                    )}
                    {img.status === 'completed' && img.imageUrl && (
                      <>
                        <Image src={img.imageUrl} alt={img.description} style={{ width: '100%', borderRadius: 4 }} />
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0' }}>{img.description}</p>
                        <Space size={4}>
                          <Button size="small" onClick={() => addImageToBlocks(img.imageUrl!, img.description)}>
                            Add to Content
                          </Button>
                          <Button size="small" onClick={() => setAsCoverImage(img.imageUrl!)}>
                            Set Cover
                          </Button>
                        </Space>
                      </>
                    )}
                    {img.status === 'failed' && (
                      <div style={{ color: '#ef4444', fontSize: 12, padding: 8 }}>
                        Failed: {img.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* SEO Settings */}
          <Card title={<><SearchOutlined /> SEO Settings</>}>
            <Collapse
              ghost
              items={[
                {
                  key: 'seo',
                  label: 'Custom SEO Meta',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Input
                        placeholder="Meta Title (auto from title if empty)"
                        value={seoMeta.metaTitle}
                        onChange={(e) => setSeoMeta(prev => ({ ...prev, metaTitle: e.target.value }))}
                      />
                      <Input.TextArea
                        placeholder="Meta Description (max 160 chars)"
                        maxLength={160}
                        showCount
                        value={seoMeta.metaDescription}
                        onChange={(e) => setSeoMeta(prev => ({ ...prev, metaDescription: e.target.value }))}
                        rows={2}
                      />
                      <Select
                        mode="tags"
                        placeholder="Meta Keywords"
                        value={seoMeta.metaKeywords}
                        onChange={(v) => setSeoMeta(prev => ({ ...prev, metaKeywords: v }))}
                        style={{ width: '100%' }}
                      />
                      <Input
                        placeholder="OG Image URL"
                        value={seoMeta.ogImage}
                        onChange={(e) => setSeoMeta(prev => ({ ...prev, ogImage: e.target.value }))}
                      />
                      <Input
                        placeholder="Canonical URL"
                        value={seoMeta.canonicalUrl}
                        onChange={(e) => setSeoMeta(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                      />
                      <Space>
                        <Switch
                          checked={seoMeta.noIndex}
                          onChange={(v) => setSeoMeta(prev => ({ ...prev, noIndex: v }))}
                        />
                        <span style={{ fontSize: 12 }}>noindex</span>
                        <Switch
                          checked={seoMeta.noFollow}
                          onChange={(v) => setSeoMeta(prev => ({ ...prev, noFollow: v }))}
                        />
                        <span style={{ fontSize: 12 }}>nofollow</span>
                      </Space>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
