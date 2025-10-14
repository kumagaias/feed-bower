'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Bower, ChickStats } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

export interface LikedArticle {
  id: string
  title: string
  url: string
  likedAt: Date
  bower?: string
}

interface AppContextType {
  user: User | null
  bowers: Bower[]
  setBowers: (bowers: Bower[]) => void
  currentBower: Bower | null
  setCurrentBower: (bower: Bower | null) => void
  chickStats: ChickStats
  setChickStats: (stats: ChickStats) => void
  language: 'en' | 'ja'
  setLanguage: (lang: 'en' | 'ja') => void
  isMobile: boolean
  setIsMobile: (mobile: boolean) => void
  likedArticles: LikedArticle[]
  setLikedArticles: (articles: LikedArticle[]) => void
  addLikedArticle: (article: LikedArticle) => void
  removeLikedArticle: (articleId: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth()
  const [bowers, setBowers] = useState<Bower[]>([])
  const [currentBower, setCurrentBower] = useState<Bower | null>(null)
  const [chickStats, setChickStats] = useState<ChickStats>({
    totalLikes: 0,
    level: 1,
    experience: 0,
    nextLevelExp: 10,
    checkedDays: 0
  })
  const [language, setLanguage] = useState<'en' | 'ja'>('ja')
  const [isMobile, setIsMobile] = useState(false)
  const [likedArticles, setLikedArticles] = useState<LikedArticle[]>([])

  // Load user settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('feed-bower-language') as 'en' | 'ja'
      if (savedLanguage) {
        setLanguage(savedLanguage)
      }

      // Load user-specific data when user changes
      if (authUser) {
        const userKey = `feed-bower-${authUser.id}`
        
        // Load chick stats
        const savedChickStats = localStorage.getItem(`${userKey}-chick-stats`)
        if (savedChickStats) {
          setChickStats(JSON.parse(savedChickStats))
        }

        // Load liked articles
        const savedLikedArticles = localStorage.getItem(`${userKey}-liked-articles`)
        if (savedLikedArticles) {
          setLikedArticles(JSON.parse(savedLikedArticles))
        }

        // Load bowers
        const savedBowers = localStorage.getItem(`${userKey}-bowers`)
        if (savedBowers) {
          setBowers(JSON.parse(savedBowers))
        }
      } else {
        // Clear user-specific data when logged out
        setChickStats({
          totalLikes: 0,
          level: 1,
          experience: 0,
          nextLevelExp: 10,
          checkedDays: 0
        })
        setLikedArticles([])
        setBowers([])
        setCurrentBower(null)
      }
    }
  }, [authUser])

  // Save language preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('feed-bower-language', language)
    }
  }, [language])

  // Save user-specific data
  useEffect(() => {
    if (typeof window !== 'undefined' && authUser) {
      const userKey = `feed-bower-${authUser.id}`
      localStorage.setItem(`${userKey}-chick-stats`, JSON.stringify(chickStats))
    }
  }, [chickStats, authUser])

  useEffect(() => {
    if (typeof window !== 'undefined' && authUser) {
      const userKey = `feed-bower-${authUser.id}`
      localStorage.setItem(`${userKey}-liked-articles`, JSON.stringify(likedArticles))
    }
  }, [likedArticles, authUser])

  useEffect(() => {
    if (typeof window !== 'undefined' && authUser) {
      const userKey = `feed-bower-${authUser.id}`
      localStorage.setItem(`${userKey}-bowers`, JSON.stringify(bowers))
    }
  }, [bowers, authUser])

  const addLikedArticle = (article: LikedArticle) => {
    setLikedArticles(prev => [article, ...prev])
  }

  const removeLikedArticle = (articleId: string) => {
    setLikedArticles(prev => prev.filter(a => a.id !== articleId))
  }

  return (
    <AppContext.Provider value={{
      user: authUser,
      bowers, setBowers,
      currentBower, setCurrentBower,
      chickStats, setChickStats,
      language, setLanguage,
      isMobile, setIsMobile,
      likedArticles, setLikedArticles,
      addLikedArticle, removeLikedArticle
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}