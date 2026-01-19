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
  verifyEmail as apiVerifyEmail,
  resendVerification as apiResendVerification,
  loginWithGoogle as apiLoginWithGoogle,
  getMe,
  clearAuth,
  getAuthToken,
  RegisterResponse,
} from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name?: string) => Promise<RegisterResponse>
  verifyEmail: (email: string, code: string) => Promise<User>
  resendVerification: (email: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<User>
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

  const login = async (email: string, password: string): Promise<User> => {
    await apiLogin(email, password)
    const userData = await getMe()
    setUser(userData)
    return userData
  }

  const register = async (email: string, password: string, name?: string) => {
    const response = await apiRegister(email, password, name)
    // If verification required, don't fetch user yet
    if (response.requiresVerification) {
      return response
    }
    // If no verification needed, fetch user data
    const userData = await getMe()
    setUser(userData)
    return response
  }

  const verifyEmail = async (email: string, code: string): Promise<User> => {
    await apiVerifyEmail(email, code)
    const userData = await getMe()
    setUser(userData)
    return userData
  }

  const resendVerification = async (email: string) => {
    await apiResendVerification(email)
  }

  const loginWithGoogle = async (credential: string): Promise<User> => {
    await apiLoginWithGoogle(credential)
    const userData = await getMe()
    setUser(userData)
    return userData
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
        verifyEmail,
        resendVerification,
        loginWithGoogle,
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
