'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Button,
  message,
  Popconfirm,
  Typography,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  getPosts,
  deletePost,
  publishPost,
  unpublishPost,
  type Post,
  type PostFilters,
  type PaginationInfo,
} from '@/lib/api'

const { Text } = Typography

const statusColors: Record<string, string> = {
  draft: 'default',
  published: 'green',
  archived: 'orange',
}

export default function PostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PostFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  })

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPosts(filters)
      setPosts(data.posts)
      setPagination(data.pagination)
    } catch (error) {
      message.error('Failed to fetch posts')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleTableChange = (pag: TablePaginationConfig) => {
    setFilters((prev) => ({
      ...prev,
      page: pag.current || 1,
      limit: pag.pageSize || 10,
    }))
  }

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined, page: 1 }))
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePost(id)
      message.success('Post deleted')
      fetchPosts()
    } catch (error) {
      message.error('Failed to delete post')
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await publishPost(id)
      message.success('Post published')
      fetchPosts()
    } catch (error) {
      message.error('Failed to publish post')
    }
  }

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishPost(id)
      message.success('Post unpublished')
      fetchPosts()
    } catch (error) {
      message.error('Failed to unpublish post')
    }
  }

  const columns: ColumnsType<Post> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            /{record.slug}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      width: 150,
      render: (author) => author?.name || author?.email || 'Unknown',
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 80,
      render: (value) => Number(value).toLocaleString(),
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[] | null) => (
        <Space size={4} wrap>
          {tags?.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags && tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => window.open(`/blog/${record.slug}?preview=true`, '_blank')}
            title="Preview"
          />
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/admin/posts/${record.id}`)}
          />
          {record.status === 'draft' ? (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handlePublish(record.id)}
            >
              Publish
            </Button>
          ) : record.status === 'published' ? (
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleUnpublish(record.id)}
            >
              Unpublish
            </Button>
          ) : null}
          <Popconfirm
            title="Delete this post?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input.Search
              placeholder="Search posts"
              allowClear
              style={{ width: 280 }}
              prefix={<SearchOutlined />}
              onSearch={handleSearch}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/admin/posts/new')}
          >
            New Post
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={posts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} posts`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}
