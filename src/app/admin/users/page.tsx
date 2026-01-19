'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Table,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Button,
  Modal,
  message,
  Avatar,
  Tooltip,
  Popconfirm,
} from 'antd'
import {
  SearchOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  getUsers,
  updateUserRole,
  toggleUserStatus,
  type AdminUser,
  type UserFilters,
  type PaginationInfo,
} from '@/lib/api'

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers(filters)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      message.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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

  const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
    try {
      await updateUserRole(userId, role)
      message.success('Role updated')
      fetchUsers()
    } catch (error) {
      message.error('Failed to update role')
    }
  }

  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await toggleUserStatus(userId, isActive)
      message.success(`User ${isActive ? 'activated' : 'deactivated'}`)
      fetchUsers()
    } catch (error) {
      message.error('Failed to update status')
    }
  }

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'User',
      dataIndex: 'email',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar
            src={record.avatarUrl}
            icon={<UserOutlined />}
            style={{ backgroundColor: record.avatarUrl ? undefined : '#8b5cf6' }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{record.name || 'No name'}</div>
            <div style={{ fontSize: 12, color: '#a0a0a8' }}>{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string, record) => (
        <Select
          value={role}
          size="small"
          style={{ width: 100 }}
          onChange={(value) => handleRoleChange(record.id, value as 'user' | 'admin')}
          options={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 200,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.isActive ? (
            <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
          ) : (
            <Tag color="red" icon={<CloseCircleOutlined />}>Inactive</Tag>
          )}
          {record.isPro && (
            <Tag color="gold" icon={<CrownOutlined />}>Pro</Tag>
          )}
          {record.role === 'admin' && (
            <Tag color="purple" icon={<SafetyCertificateOutlined />}>Admin</Tag>
          )}
          {record.isEmailVerified && (
            <Tooltip title="Email Verified">
              <Tag color="blue">Verified</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Credits',
      dataIndex: 'creditsUsed',
      key: 'creditsUsed',
      width: 100,
      render: (value) => Number(value).toLocaleString(),
    },
    {
      title: 'Balance',
      dataIndex: 'tokenBalance',
      key: 'tokenBalance',
      width: 120,
      render: (value) => Number(value).toLocaleString(),
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={record.isActive ? 'Deactivate user?' : 'Activate user?'}
          onConfirm={() => handleStatusToggle(record.id, !record.isActive)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            size="small"
            danger={record.isActive}
            type={record.isActive ? 'default' : 'primary'}
          >
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            placeholder="Search by email or name"
            allowClear
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
            onSearch={handleSearch}
          />
          <Select
            placeholder="Role"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilters((prev) => ({ ...prev, role: value, page: 1 }))}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <Select
            placeholder="Status"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilters((prev) => ({
              ...prev,
              isActive: value === undefined ? undefined : value === 'true',
              page: 1,
            }))}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          <Select
            placeholder="Pro"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilters((prev) => ({
              ...prev,
              isPro: value === undefined ? undefined : value === 'true',
              page: 1,
            }))}
            options={[
              { value: 'true', label: 'Pro' },
              { value: 'false', label: 'Free' },
            ]}
          />
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} users`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  )
}
