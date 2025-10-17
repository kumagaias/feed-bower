'use client'

import { useState, useEffect } from 'react'
import { bowerApi, ApiError } from '@/lib/api'
import { Bower } from '@/types'

interface UseBowersReturn {
  bowers: Bower[]
  loading: boolean
  error: string | null
  createBower: (bower: { name: string; keywords: string[]; is_public?: boolean }) => Promise<Bower | null>
  updateBower: (id: string, bower: { name?: string; keywords?: string[]; is_public?: boolean }) => Promise<Bower | null>
  deleteBower: (id: string) => Promise<boolean>
  refreshBowers: () => Promise<void>
}

export function useBowers(): UseBowersReturn {
  const [bowers, setBowers] = useState<Bower[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load bowers from API
  const loadBowers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading bowers from API...')
      const data = await bowerApi.getBowers()
      console.log('📦 Received bowers data:', data)
      console.log('📦 Data type:', typeof data)
      console.log('📦 Is array:', Array.isArray(data))
      console.log('📦 Data length:', data?.length)
      
      // Transform API data to match our Bower interface
      const transformedBowers: Bower[] = data ? data.map((bower: any) => ({
        id: bower.bower_id || bower.id,
        name: bower.name,
        keywords: bower.keywords || [],
        feeds: bower.feeds || [],
        color: bower.color || '#14b8a6',
        createdAt: new Date(bower.created_at || bower.createdAt),
        isPublic: bower.is_public || bower.isPublic || false,
        creatorId: bower.user_id || bower.creatorId,
        creatorName: bower.creatorName,
        likes: bower.likes || 0,
        likedBy: bower.likedBy || [],
        eggColors: bower.eggColors || bower.keywords?.map((_: string, i: number) => {
          const colors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']
          return colors[i % colors.length]
        }) || []
      })) : []
      
      console.log('✨ Transformed bowers:', transformedBowers)
      console.log('✨ Transformed bowers length:', transformedBowers.length)
      
      setBowers(transformedBowers)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load bowers')
      }
      console.error('Error loading bowers:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create a new bower
  const createBower = async (bowerData: { name: string; keywords: string[]; is_public?: boolean }): Promise<Bower | null> => {
    try {
      setError(null)
      const data = await bowerApi.createBower(bowerData)
      
      // Transform API response to match our Bower interface
      const newBower: Bower = {
        id: data.bower_id || data.id,
        name: data.name,
        keywords: data.keywords || [],
        feeds: data.feeds || [],
        color: data.color || '#14b8a6',
        createdAt: new Date(data.created_at || data.createdAt || Date.now()),
        isPublic: data.is_public || data.isPublic || false,
        creatorId: data.user_id || data.creatorId,
        creatorName: data.creatorName,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        eggColors: data.eggColors || data.keywords?.map((_: string, i: number) => {
          const colors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']
          return colors[i % colors.length]
        }) || []
      }
      
      setBowers(prev => [newBower, ...prev])
      return newBower
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to create bower')
      }
      console.error('Error creating bower:', err)
      return null
    }
  }

  // Update a bower
  const updateBower = async (id: string, bowerData: { name?: string; keywords?: string[]; is_public?: boolean }): Promise<Bower | null> => {
    try {
      setError(null)
      const data = await bowerApi.updateBower(id, bowerData)
      
      // Transform API response to match our Bower interface
      const updatedBower: Bower = {
        id: data.bower_id || data.id,
        name: data.name,
        keywords: data.keywords || [],
        feeds: data.feeds || [],
        color: data.color || '#14b8a6',
        createdAt: new Date(data.created_at || data.createdAt),
        isPublic: data.is_public || data.isPublic || false,
        creatorId: data.user_id || data.creatorId,
        creatorName: data.creatorName,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        eggColors: data.eggColors || data.keywords?.map((_: string, i: number) => {
          const colors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']
          return colors[i % colors.length]
        }) || []
      }
      
      setBowers(prev => prev.map(bower => bower.id === id ? updatedBower : bower))
      return updatedBower
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to update bower')
      }
      console.error('Error updating bower:', err)
      return null
    }
  }

  // Delete a bower
  const deleteBower = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      await bowerApi.deleteBower(id)
      setBowers(prev => prev.filter(bower => bower.id !== id))
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete bower')
      }
      console.error('Error deleting bower:', err)
      return false
    }
  }

  // Refresh bowers
  const refreshBowers = async () => {
    await loadBowers()
  }

  // Load bowers on mount
  useEffect(() => {
    loadBowers()
  }, [])

  return {
    bowers,
    loading,
    error,
    createBower,
    updateBower,
    deleteBower,
    refreshBowers
  }
}