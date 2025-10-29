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

// Detect browser language and return 'ja' or 'en'
const detectBrowserLanguage = (): 'ja' | 'en' => {
  if (typeof window === 'undefined') return 'en'
  
  // Get browser language (e.g., 'ja', 'ja-JP', 'en-US', 'en')
  const browserLang = navigator.language || (navigator as any).userLanguage
  
  // If language starts with 'ja', use Japanese, otherwise use English
  return browserLang.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<'ja' | 'en'>(detectBrowserLanguage())
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

  // Load user's language preference and chick stats from backend on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if user is logged in first
        const { getAuthToken } = await import('@/lib/api')
        const token = await getAuthToken()
        
        if (!token) {
          // User not logged in, use browser language
          return
        }
        
        const { authApi, chickApi } = await import('@/lib/api')
        
        // Load language preference
        const userData = await authApi.getMe()
        if (userData && userData.language) {
          setLanguageState(userData.language as 'ja' | 'en')
        } else {
          // If user doesn't have language set, update it with browser language
          const browserLang = detectBrowserLanguage()
          try {
            await authApi.updateMe({ language: browserLang })
            setLanguageState(browserLang)
            console.log('✅ Language preference initialized from browser:', browserLang)
          } catch (updateError) {
            console.log('Could not update language preference:', updateError)
          }
        }
        
        // Load chick stats
        try {
          const stats = await chickApi.getStats()
          if (stats) {
            setChickStats({
              totalLikes: stats.total_likes || 0,
              level: stats.level || 1,
              experience: stats.experience || 0,
              nextLevelExp: stats.next_level_exp || 100,
              checkedDays: stats.checked_days || 0
            })
          }
        } catch (statsError) {
          console.log('Could not load chick stats:', statsError)
        }
      } catch (error) {
        // API error - keep defaults
      }
    }

    loadUserData()
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