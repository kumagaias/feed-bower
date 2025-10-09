'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { User, Bower, ChickStats } from '@/types'

interface LikedArticle {
  id: string
  title: string
  url: string
  likedAt: Date
  bower?: string
}

interface AppContextType {
  user: User | null
  setUser: (user: User | null) => void
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
  const [user, setUser] = useState<User | null>(null)
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

  const addLikedArticle = (article: LikedArticle) => {
    setLikedArticles(prev => [article, ...prev])
  }

  const removeLikedArticle = (articleId: string) => {
    setLikedArticles(prev => prev.filter(a => a.id !== articleId))
  }

  return (
    <AppContext.Provider value={{
      user, setUser,
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