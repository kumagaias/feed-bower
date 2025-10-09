import { useState, useEffect } from 'react'

export interface Bower {
  id: string
  name: string
  keywords: string[]
  eggColors: string[]
  feeds: any[]
  color: string
  createdAt: Date
  isPublic: boolean
  creatorId?: string
  creatorName?: string
  likes?: number
  likedBy?: string[]
}

export function useBowers() {
  const [bowers, setBowers] = useState<Bower[]>([])

  // Load bowers from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBowers = localStorage.getItem('bowers')
      if (savedBowers) {
        try {
          const parsed = JSON.parse(savedBowers)
          const bowersWithDates = parsed.map((bower: any) => ({
            ...bower,
            createdAt: new Date(bower.createdAt)
          }))
          setBowers(bowersWithDates)
        } catch (error) {
          console.error('Failed to parse bowers:', error)
        }
      }
    }
  }, [])

  // Save bowers to localStorage whenever they change
  const saveBowers = (newBowers: Bower[]) => {
    setBowers(newBowers)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bowers', JSON.stringify(newBowers))
    }
  }

  const addBower = (bower: Bower) => {
    saveBowers([...bowers, bower])
  }

  const updateBower = (id: string, updates: Partial<Bower>) => {
    const updated = bowers.map(b => 
      b.id === id ? { ...b, ...updates } : b
    )
    saveBowers(updated)
  }

  const deleteBower = (id: string) => {
    const filtered = bowers.filter(b => b.id !== id)
    saveBowers(filtered)
  }

  const likeBower = (bowerId: string, userId: string) => {
    const updated = bowers.map(b => {
      if (b.id === bowerId) {
        const likedBy = b.likedBy || []
        const isLiked = likedBy.includes(userId)
        
        if (isLiked) {
          // Unlike
          return {
            ...b,
            likes: (b.likes || 0) - 1,
            likedBy: likedBy.filter(id => id !== userId)
          }
        } else {
          // Like
          return {
            ...b,
            likes: (b.likes || 0) + 1,
            likedBy: [...likedBy, userId]
          }
        }
      }
      return b
    })
    saveBowers(updated)
  }

  return {
    bowers,
    setBowers: saveBowers,
    addBower,
    updateBower,
    deleteBower,
    likeBower
  }
}
