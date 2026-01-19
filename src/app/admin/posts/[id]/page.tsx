'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Card,
  Input,
  Button,
  Space,
  Select,
  message,
  Form,
  Spin,
} from 'antd'
import {
  SaveOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  StopOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  getPostById,
  updatePost,
  publishPost,
  unpublishPost,
  type BlockContent,
  type Post,
} from '@/lib/api'
import BlockEditor from '../_components/block-editor'

export default function EditPostPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [form] = Form.useForm()
  const [post, setPost] = useState<Post | null>(null)
  const [blocks, setBlocks] = useState<BlockContent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await getPostById(postId)
        setPost(data)
        setBlocks(data.blocks || [])
        form.setFieldsValue({
          title: data.title,
          excerpt: data.excerpt,
          coverImage: data.coverImage,
          tags: data.tags,
        })
      } catch (error) {
        message.error('Failed to load post')
        router.push('/admin/posts')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId, form, router])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      await updatePost(postId, {
        title: values.title,
        excerpt: values.excerpt,
        coverImage: values.coverImage,
        tags: values.tags,
        blocks,
      })

      message.success('Post updated')
    } catch (error: any) {
      if (error?.errorFields) {
        message.error('Please fill in required fields')
      } else {
        message.error('Failed to update post')
      }
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    try {
      setSaving(true)
      await handleSave()
      await publishPost(postId)
      message.success('Post published')
      setPost((prev) => prev ? { ...prev, status: 'published' } : null)
    } catch (error) {
      message.error('Failed to publish')
    } finally {
      setSaving(false)
    }
  }

  const handleUnpublish = async () => {
    try {
      setSaving(true)
      await unpublishPost(postId)
      message.success('Post unpublished')
      setPost((prev) => prev ? { ...prev, status: 'draft' } : null)
    } catch (error) {
      message.error('Failed to unpublish')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/admin/posts')}
          >
            Back
          </Button>
          <Space>
            <Button
              icon={<EyeOutlined />}
              onClick={() => window.open(`/blog/${post?.slug}?preview=true`, '_blank')}
            >
              Preview
            </Button>
            <Button
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Save
            </Button>
            {post?.status === 'published' ? (
              <Button
                icon={<StopOutlined />}
                loading={saving}
                onClick={handleUnpublish}
              >
                Unpublish
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={saving}
                onClick={handlePublish}
              >
                Publish
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      <Card title="Post Details" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="Enter post title" size="large" />
          </Form.Item>

          <Form.Item name="excerpt" label="Excerpt">
            <Input.TextArea
              placeholder="Brief description of the post"
              rows={2}
            />
          </Form.Item>

          <Form.Item name="coverImage" label="Cover Image URL">
            <Input placeholder="https://example.com/image.jpg" />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select
              mode="tags"
              placeholder="Add tags"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Content Blocks">
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </Card>
    </div>
  )
}
