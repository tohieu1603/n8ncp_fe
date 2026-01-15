'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import {
  User,
  login as apiLogin,
  register as apiRegister,
  getMe,
  clearAuth,
  getAuthToken,
} from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const userData = await getMe()
      setUser(userData)
    } catch {
      clearAuth()
      setUser(null)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken()
      if (token) {
        try {
          const userData = await getMe()
          setUser(userData)
        } catch {
          clearAuth()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    // After login, fetch full user data
    const userData = await getMe()
    setUser(userData)
  }

  const register = async (email: string, password: string, name?: string) => {
    const response = await apiRegister(email, password, name)
    // After register, fetch full user data
    const userData = await getMe()
    setUser(userData)
  }

  const logout = () => {
    clearAuth()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
