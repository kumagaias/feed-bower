'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { authApi, ApiError } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'feed-bower-token',
  USER: 'feed-bower-user',
  TOKEN_EXPIRY: 'feed-bower-token-expiry',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check if token is expired
  const isTokenExpired = (): boolean => {
    const expiry = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY)
    if (!expiry) return true
    return Date.now() > parseInt(expiry)
  }

  // Save token and user data
  const saveAuthData = (token: string, userData: User, expiresIn: number = 7 * 24 * 60 * 60 * 1000) => {
    const expiryTime = Date.now() + expiresIn
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString())
    setUser(userData)
  }

  // Clear auth data
  const clearAuthData = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY)
    setUser(null)
  }

  // Get stored token
  const getStoredToken = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.TOKEN)
  }

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true)
      
      // Development environment mock login
      if (process.env.NODE_ENV === 'development' && email === 'guest@example.com' && password === 'guest123abc') {
        const devUser: User = {
          id: 'dev-user-001',
          email: 'guest@example.com',
          name: 'Development User',
          isGuest: false
        }
        
        const mockToken = `dev-token-${Date.now()}`
        saveAuthData(mockToken, devUser)
        return
      }
      
      // Production API call
      const response = await authApi.login(email, password)
      
      if (response.token && response.user) {
        saveAuthData(response.token, response.user)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      clearAuthData()
      throw error
    } finally {
      setIsLoading(false)
    }
  }



  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true)
      
      // Try to call logout API if we have a token
      const token = getStoredToken()
      if (token && user?.id !== 'dev-user-001') {
        try {
          await authApi.logout()
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error)
        }
      }
      
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }

  // Check authentication status
  const checkAuth = async (): Promise<void> => {
    try {
      setIsLoading(true)
      
      const token = getStoredToken()
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER)
      
      if (!token || !storedUser || isTokenExpired()) {
        clearAuthData()
        return
      }

      // Parse stored user data
      const userData = JSON.parse(storedUser) as User
      
      // For development user, just restore from localStorage
      if (userData.id === 'dev-user-001') {
        setUser(userData)
        return
      }

      // For regular users, verify with server
      try {
        const response = await authApi.getMe()
        if (response.user) {
          setUser(response.user)
        } else {
          clearAuthData()
        }
      } catch (error) {
        // If API call fails, clear auth data
        clearAuthData()
      }
      
    } catch (error) {
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set up token expiry check
  useEffect(() => {
    if (!user) return

    const checkTokenExpiry = () => {
      if (isTokenExpired()) {
        logout()
      }
    }

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000)
    
    return () => clearInterval(interval)
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      login,
      logout,
      checkAuth,
    }}>
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

// Helper function to get auth token for API requests
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.TOKEN)
}