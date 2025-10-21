'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { feedApi, ApiError } from '@/lib/api'
import { Bower, Article, Feed } from '@/types'

interface BowerPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  bower: Bower | null
}

interface GroupedArticles {
  [feedId: string]: {
    feed: Feed
    articles: Article[]
  }
}

export default function BowerPreviewModal({ isOpen, onClose, bower }: BowerPreviewModalProps) {
  const { language } = useApp()
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBowerArticles = useCallback(async () => {
    if (!bower?.id || bower.id === 'preview') {
      // Skip fetching for preview/unsaved bowers
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const articlesData = await feedApi.getBowerArticles(bower.id, 25) // Limit to 25 articles total
      setArticles(articlesData || [])
    } catch (error) {
      console.error('Failed to fetch bower articles:', error)
      if (error instanceof ApiError) {
        setError(error.message)
      } else {
        setError(language === 'ja' ? '記事の取得に失敗しました' : 'Failed to fetch articles')
      }
    } finally {
      setIsLoading(false)
    }
  }, [bower?.id, language])

  // Fetch articles when modal opens
  useEffect(() => {
    if (isOpen && bower?.id) {
      fetchBowerArticles()
    }
  }, [isOpen, bower?.id, fetchBowerArticles])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setArticles([])
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const handleRetry = () => {
    fetchBowerArticles()
  }

  // Group articles by feed and limit to 5 per feed
  const groupedArticles: GroupedArticles = {}
  if (bower?.feeds && Array.isArray(bower.feeds)) {
    bower.feeds.forEach(feed => {
      if (!feed || !feed.id) return // Skip invalid feeds
      
      const feedArticles = articles
        .filter(article => article.feedId === feed.id)
        .slice(0, 5) // Limit to 5 articles per feed
      
      if (feedArticles.length > 0) {
        groupedArticles[feed.id] = {
          feed,
          articles: feedArticles
        }
      }
    })
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      return () => document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, onClose])

  // Handle click outside to close modal
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !bower) return null

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-amber-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="text-xl sm:text-2xl">🪺</div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
              {bower.name}
            </h2>
            <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">
              {language === 'ja' ? 'プレビュー' : 'Preview'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl ml-2 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-bounce text-4xl mb-4">🐣</div>
              <p className="text-gray-600 text-lg">
                {language === 'ja' ? '記事を取得中...' : 'Fetching articles...'}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0f766e] transition-colors"
              >
                {language === 'ja' ? '再試行' : 'Retry'}
              </button>
            </div>
          )}

          {/* Empty State or Feed List for Preview */}
          {!isLoading && !error && articles.length === 0 && (
            <div className="text-center py-12">
              {bower?.feeds && bower.feeds.length > 0 ? (
                <div>
                  <div className="text-4xl mb-4">🪺</div>
                  <p className="text-gray-600 text-lg mb-4">
                    {language === 'ja' ? 'フィード一覧' : 'Feed List'}
                  </p>
                  <div className="space-y-2 max-w-2xl mx-auto">
                    {bower.feeds.map((feed: any, index: number) => (
                      <div key={feed.id || index} className="p-3 bg-gray-50 rounded-lg text-left">
                        <div className="font-medium text-sm text-gray-800">
                          {feed.title || feed.url}
                        </div>
                        <div className="text-xs text-gray-500 break-all">
                          {feed.url}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm mt-4">
                    {language === 'ja' 
                      ? 'バウアーを保存すると記事が取得されます' 
                      : 'Articles will be fetched after saving the bower'
                    }
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">📰</div>
                  <p className="text-gray-600 text-lg">
                    {language === 'ja' ? 'フィードが登録されていません' : 'No feeds registered'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {language === 'ja' 
                      ? 'キーワードを設定してフィードを追加してください' 
                      : 'Please set keywords and add feeds'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Articles Content */}
          {!isLoading && !error && articles.length > 0 && (
            <div className="space-y-4 sm:space-y-6">
              {Object.values(groupedArticles).map(({ feed, articles }) => (
                <div key={feed.id} className="border rounded-lg p-3 sm:p-4">
                  {/* Feed Header */}
                  <div className="mb-3 sm:mb-4 pb-2 border-b">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                      {feed.title || feed.url}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 break-all">{feed.url}</p>
                    {feed.description && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">{feed.description}</p>
                    )}
                  </div>

                  {/* Articles */}
                  <div className="space-y-2 sm:space-y-3">
                    {articles.map((article) => (
                      <ArticlePreviewCard 
                        key={article.id} 
                        article={article} 
                        language={language}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Article Preview Card Component
interface ArticlePreviewCardProps {
  article: Article
  language: 'ja' | 'en'
}

function ArticlePreviewCard({ article, language }: ArticlePreviewCardProps) {
  // Truncate content based on screen size (shorter for mobile)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const maxLength = isMobile ? 120 : 200
  const truncatedContent = article.content && article.content.length > maxLength
    ? article.content.substring(0, maxLength) + '...'
    : article.content || ''

  // Format published date
  const formatDate = (date: Date) => {
    const articleDate = new Date(date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - articleDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return language === 'ja' ? '1日前' : '1 day ago'
    } else if (diffDays < 7) {
      return language === 'ja' ? `${diffDays}日前` : `${diffDays} days ago`
    } else {
      return articleDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')
    }
  }

  const handleArticleClick = () => {
    if (article.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div 
      className="p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
      onClick={handleArticleClick}
    >
      {/* Mobile: Stack vertically, Desktop: Side by side */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
        <h4 className="font-medium text-gray-800 text-sm line-clamp-2 flex-1 sm:mr-2 mb-1 sm:mb-0">
          {article.title || (language === 'ja' ? 'タイトルなし' : 'No title')}
        </h4>
        <span className="text-xs text-gray-500 sm:whitespace-nowrap">
          {formatDate(article.publishedAt)}
        </span>
      </div>
      
      {truncatedContent && (
        <p className="text-xs text-gray-600 line-clamp-2 sm:line-clamp-3 mb-2">
          {truncatedContent}
        </p>
      )}
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#14b8a6] hover:text-[#0f766e]">
          {language === 'ja' ? '続きを読む →' : 'Read more →'}
        </span>
      </div>
    </div>
  )
}