'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin } from 'antd'
import {
  UserOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { getUserStats, type UserStats } from '@/lib/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.total || 0}
              prefix={<UserOutlined style={{ color: '#8b5cf6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined style={{ color: '#22c55e' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pro Users"
              value={stats?.pro || 0}
              prefix={<CrownOutlined style={{ color: '#f59e0b' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Admins"
              value={stats?.admins || 0}
              prefix={<SafetyCertificateOutlined style={{ color: '#ec4899' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Quick Stats">
            <p style={{ color: '#a0a0a8', marginBottom: 8 }}>
              <strong style={{ color: '#f5f5f5' }}>{stats?.verified || 0}</strong> verified users
            </p>
            <p style={{ color: '#a0a0a8', marginBottom: 8 }}>
              Verification rate: <strong style={{ color: '#f5f5f5' }}>
                {stats?.total ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}%
              </strong>
            </p>
            <p style={{ color: '#a0a0a8' }}>
              Pro conversion: <strong style={{ color: '#f5f5f5' }}>
                {stats?.total ? ((stats.pro / stats.total) * 100).toFixed(1) : 0}%
              </strong>
            </p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick Actions">
            <p style={{ color: '#a0a0a8' }}>
              Use the sidebar navigation to manage users and posts.
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
