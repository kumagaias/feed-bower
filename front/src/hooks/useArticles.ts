'use client'

import { useState, useEffect, useCallback } from 'react'
import { articleApi, chickApi, ApiError } from '@/lib/api'
import { Article } from '@/types'

interface UseArticlesParams {
  bowerId?: string
  search?: string
  tab?: 'all' | 'important' | 'liked'
}

interface UseArticlesReturn {
  articles: Article[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
  likeArticle: (id: string) => Promise<void>
  toggleRead: (id: string) => Promise<void>
  searchArticles: (query: string) => void
}

export function useArticles({ bowerId, search, tab = 'all' }: UseArticlesParams = {}): UseArticlesReturn {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState(search || '')

  const LIMIT = 50

  // Transform API article data to match our Article interface
  const transformArticle = (apiArticle: any): Article => {
    // Convert Unix timestamp (seconds) to milliseconds for Date constructor
    const publishedAtMs = typeof apiArticle.published_at === 'number' 
      ? apiArticle.published_at * 1000 
      : apiArticle.published_at || apiArticle.publishedAt;
    
    return {
      id: apiArticle.article_id || apiArticle.id,
      feedId: apiArticle.feed_id || apiArticle.feedId,
      title: apiArticle.title,
      content: apiArticle.content,
      url: apiArticle.url,
      publishedAt: new Date(publishedAtMs),
      liked: apiArticle.liked || false,
      bower: apiArticle.bower || 'Unknown',
      read: apiArticle.read || false,
      image: apiArticle.image_url || apiArticle.image
    };
  }

  // Load articles from API
  const loadArticles = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setOffset(0)
      }
      setError(null)

      let data
      const currentOffset = isLoadMore ? offset : 0

      if (tab === 'liked') {
        // Load liked articles
        data = await articleApi.getLikedArticles(LIMIT, currentOffset)
      } else if (tab === 'important') {
        // Load important articles (same as regular for now, but could be filtered)
        const params: any = {
          limit: LIMIT,
          offset: currentOffset,
          sort: 'published_at',
          order: 'desc' as const,
          important: true // Add flag for important articles
        }

        if (bowerId && bowerId !== 'all') {
          params.bower_id = bowerId
        }

        if (searchQuery) {
          params.search = searchQuery
        }

        data = await articleApi.getArticles(params)
      } else {
        // Load regular articles
        const params: any = {
          limit: LIMIT,
          offset: currentOffset,
          sort: 'published_at',
          order: 'desc' as const
        }

        if (bowerId && bowerId !== 'all') {
          params.bower_id = bowerId
        }

        if (searchQuery) {
          params.search = searchQuery
        }

        data = await articleApi.getArticles(params)
      }

      if (data) {
        const transformedArticles = data.articles.map(transformArticle)
        
        if (isLoadMore) {
          setArticles(prev => [...prev, ...transformedArticles])
          setOffset(prev => prev + LIMIT)
        } else {
          setArticles(transformedArticles)
          setOffset(LIMIT)
        }
        
        setHasMore(data.has_more || false)
        setTotal(data.total || 0)
      } else {
        if (!isLoadMore) {
          setArticles([])
          setHasMore(false)
          setTotal(0)
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load articles')
      }
      console.error('Error loading articles:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [bowerId, searchQuery, tab]) // offsetを依存配列から削除

  // Load more articles
  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    await loadArticles(true)
  }

  // Refresh articles
  const refresh = async () => {
    await loadArticles(false)
  }

  // Like/unlike an article
  const likeArticle = async (id: string) => {
    try {
      const article = articles.find(a => a.id === id)
      if (!article) return

      if (article.liked) {
        await articleApi.unlikeArticle(id)
      } else {
        await articleApi.likeArticle(id)
      }

      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, liked: !a.liked } : a
      ))

      // Update chick stats (simplified - in real app this would be handled by backend)
      // This is just for UI feedback
    } catch (err) {
      console.error('Error toggling like:', err)
      // Revert optimistic update on error
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, liked: !a.liked } : a
      ))
    }
  }

  // Toggle read status
  const toggleRead = async (id: string) => {
    try {
      const article = articles.find(a => a.id === id)
      if (!article) return

      if (!article.read) {
        await articleApi.markAsRead(id)
      }

      // Update local state
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, read: !a.read } : a
      ))
    } catch (err) {
      console.error('Error toggling read status:', err)
      // Revert optimistic update on error
      setArticles(prev => prev.map(a => 
        a.id === id ? { ...a, read: !a.read } : a
      ))
    }
  }

  // Search articles
  const searchArticles = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Load articles when dependencies change
  useEffect(() => {
    loadArticles(false)
  }, [loadArticles])

  return {
    articles,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    likeArticle,
    toggleRead,
    searchArticles
  }
}