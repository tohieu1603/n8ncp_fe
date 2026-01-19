'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ConfigProvider, Layout, Menu, theme, Spin, message, Button } from 'antd'
import {
  UserOutlined,
  FileTextOutlined,
  DashboardOutlined,
  LeftOutlined,
  CrownOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { getAuthToken, getMe } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

const { Sider, Content, Header } = Layout

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined />, href: '/admin' },
  { key: 'users', label: 'Users', icon: <UserOutlined />, href: '/admin/users' },
  { key: 'posts', label: 'Posts', icon: <FileTextOutlined />, href: '/admin/posts' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      try {
        const user = await getMe()
        if ((user as any).role !== 'admin') {
          message.error('Access denied. Admin only.')
          router.push('/')
          return
        }
        setIsAuthorized(true)
      } catch {
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const getSelectedKey = () => {
    if (pathname === '/admin') return 'dashboard'
    if (pathname.startsWith('/admin/users')) return 'users'
    if (pathname.startsWith('/admin/posts')) return 'posts'
    return 'dashboard'
  }

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  if (isLoading) {
    return (
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#8b5cf6',
            borderRadius: 8,
          },
        }}
      >
        <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      </ConfigProvider>
    )
  }

  if (!isAuthorized) {
    return (
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#8b5cf6',
            borderRadius: 8,
          },
        }}
      >
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CrownOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <h1 style={{ color: '#f5f5f5', fontSize: 24, margin: 0 }}>Admin Panel</h1>
          <p style={{ color: '#a0a0a8', margin: 0 }}>Vui lòng đăng nhập để tiếp tục</p>
          <Button
            type="primary"
            size="large"
            icon={<LoginOutlined />}
            onClick={() => router.push('/auth/login')}
            style={{ marginTop: 8 }}
          >
            Đăng nhập
          </Button>
        </div>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#8b5cf6',
          borderRadius: 8,
          colorBgContainer: '#141419',
          colorBgElevated: '#1a1a22',
          colorBorder: 'rgba(255,255,255,0.08)',
          colorText: '#f5f5f5',
          colorTextSecondary: '#a0a0a8',
        },
        components: {
          Layout: {
            siderBg: '#111117',
            headerBg: '#111117',
            bodyBg: '#0a0a0f',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(139,92,246,0.15)',
            darkItemSelectedColor: '#a78bfa',
          },
          Table: {
            headerBg: '#1a1a22',
            rowHoverBg: 'rgba(139,92,246,0.05)',
          },
          Card: {
            colorBgContainer: '#141419',
          },
        },
      }}
    >
      <Layout className="admin-panel" style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          style={{
            borderRight: '1px solid rgba(255,255,255,0.08)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CrownOutlined style={{ fontSize: 18, color: '#fff' }} />
            </div>
            {!collapsed && (
              <span style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5' }}>
                Admin Panel
              </span>
            )}
          </div>

          {/* Back link */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#a0a0a8',
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              <LeftOutlined style={{ fontSize: 12 }} />
              {!collapsed && 'Back to App'}
            </Link>
          </div>

          {/* Navigation */}
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            style={{ border: 'none', marginTop: 8 }}
            items={menuItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: <Link href={item.href}>{item.label}</Link>,
            }))}
          />
        </Sider>

        <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
          <Header style={{
            padding: '0 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#f5f5f5' }}>
              {pathname === '/admin' && 'Dashboard'}
              {pathname.startsWith('/admin/users') && 'User Management'}
              {pathname.startsWith('/admin/posts') && 'Post Management'}
            </h1>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              type="text"
              style={{ color: '#a0a0a8' }}
            >
              Đăng xuất
            </Button>
          </Header>

          <Content style={{ padding: 24, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
