import React, { createContext, useContext, useEffect, useState } from 'react'
import { api, isJwtExpired, clearAuthStorage } from '../api/axios'

export type Role = 'USER' | 'MODERATOR' | 'ADMIN'

export interface User {
  id: number
  email: string
  name: string
  role: Role
  language: string
  alertPreferences?: string
  active: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, language?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: { name?: string; language?: string; alertPreferences?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem('accessToken'))

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      if (isJwtExpired(token)) {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken || isJwtExpired(refreshToken)) {
          clearAuthStorage()
          setUser(null)
          setIsLoading(false)
          return
        }
      }

      api.get<User>('/auth/me')
        .then((res) => {
          setUser(res.data)
          localStorage.setItem('user', JSON.stringify(res.data))
        })
        .catch(() => {
          clearAuthStorage()
          setUser(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken, refreshToken, user: userData } = res.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const register = async (email: string, password: string, name: string, language = 'en') => {
    const res = await api.post('/auth/register', { email, password, name, language })
    const { accessToken, refreshToken, user: userData } = res.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const updateProfile = async (data: { name?: string; language?: string; alertPreferences?: string }) => {
    const res = await api.patch<User>('/auth/me', data)
    setUser(res.data)
    localStorage.setItem('user', JSON.stringify(res.data))
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
