'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ChickStats {
  totalLikes: number
  level: number
  experience: number
  nextLevelExp: number
  checkedDays: number
}

interface AppContextType {
  language: 'ja' | 'en'
  bowers: any[]
  chickStats: ChickStats
  likedArticles: any[]
  isMobile: boolean
  demoMode: boolean
  setLanguage: (lang: 'ja' | 'en') => void
  setBowers: (bowers: any[]) => void
  setChickStats: (stats: ChickStats) => void
  setLikedArticles: (articles: any[]) => void
  setIsMobile: (mobile: boolean) => void
  setDemoMode: (demo: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

interface AppProviderProps {
  children: ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<'ja' | 'en'>('en')
  const [bowers, setBowers] = useState<any[]>([])
  const [chickStats, setChickStats] = useState<ChickStats>({
    totalLikes: 0,
    level: 1,
    experience: 0,
    nextLevelExp: 100,
    checkedDays: 0
  })
  const [likedArticles, setLikedArticles] = useState<any[]>([])
  const [demoMode, setDemoMode] = useState<boolean>(false)
  const [isMobile, setIsMobile] = useState(false)

  // Load user's language preference from backend on mount
  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const { authApi } = await import('@/lib/api')
        console.log('🌐 Loading user language preference...')
        const userData = await authApi.getMe()
        console.log('📥 User data received:', userData)
        if (userData && userData.language) {
          setLanguageState(userData.language as 'ja' | 'en')
          console.log('✅ Language set to:', userData.language)
        } else {
          console.log('⚠️ No language in user data, using default (en)')
        }
      } catch (error) {
        // User not logged in or API error - keep default 'en'
        console.log('⚠️ Failed to load language, using default (en):', error)
      }
    }

    loadUserLanguage()
  }, [])

  const setLanguage = async (lang: 'ja' | 'en') => {
    // Update local state immediately for better UX
    setLanguageState(lang)
    
    // Try to save to backend (only if user is logged in)
    try {
      const { authApi } = await import('@/lib/api')
      await authApi.updateMe({ language: lang })
      console.log('✅ Language preference saved to backend:', lang)
    } catch (error) {
      // Silently fail if not logged in or API error
      // Language preference will still work locally
      console.log('Language preference not saved to backend:', error)
    }
  }

  const value: AppContextType = {
    language,
    bowers,
    chickStats,
    likedArticles,
    isMobile,
    demoMode,
    setLanguage,
    setBowers,
    setChickStats,
    setLikedArticles,
    setIsMobile,
    setDemoMode
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export default AppContext