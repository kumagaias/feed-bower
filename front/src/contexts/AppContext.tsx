'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

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
  setLanguage: (lang: 'ja' | 'en') => void
  setBowers: (bowers: any[]) => void
  setChickStats: (stats: ChickStats) => void
  setLikedArticles: (articles: any[]) => void
  setIsMobile: (mobile: boolean) => void
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
  const [language, setLanguageState] = useState<'ja' | 'en'>('ja')
  const [bowers, setBowers] = useState<any[]>([])
  const [chickStats, setChickStats] = useState<ChickStats>({
    totalLikes: 0,
    level: 1,
    experience: 0,
    nextLevelExp: 100,
    checkedDays: 0
  })
  const [likedArticles, setLikedArticles] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)

  const setLanguage = async (lang: 'ja' | 'en') => {
    // Update local state immediately for better UX
    setLanguageState(lang)
    
    // Try to save to backend (only if user is logged in)
    try {
      const { authApi } = await import('@/lib/api')
      await authApi.updateMe({ language: lang })
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
    setLanguage,
    setBowers,
    setChickStats,
    setLikedArticles,
    setIsMobile
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export default AppContext