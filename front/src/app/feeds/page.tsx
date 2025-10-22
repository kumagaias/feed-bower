'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import ArticleCard from '@/components/ArticleCard'
import LoadingAnimation from '@/components/LoadingAnimation'
import { useApp } from '@/contexts/AppContext'
import { useBowers } from '@/hooks/useBowers'
import { useArticles } from '@/hooks/useArticles'
import { useTranslation } from '@/lib/i18n'

type TabType = 'all' | 'important' | 'liked'

export default function FeedsPage() {
  const router = useRouter()
  const { language } = useApp()
  const t = useTranslation(language)
  const { bowers, loading: bowersLoading } = useBowers()
  
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [selectedBowerId, setSelectedBowerId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateGroups, setDateGroups] = useState<{ [key: string]: boolean }>({})
  const [allDatesOpen, setAllDatesOpen] = useState(true)

  // Read bowerId from URL parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const bowerIdParam = params.get('bowerId')
      if (bowerIdParam) {
        setSelectedBowerId(bowerIdParam)
      }
    }
  }, [])

  const { 
    articles, 
    loading: articlesLoading, 
    error, 
    hasMore, 
    total,
    loadMore, 
    refresh, 
    likeArticle, 
    toggleRead,
    searchArticles 
  } = useArticles({ 
    bowerId: selectedBowerId === 'all' ? undefined : selectedBowerId,
    search: searchQuery,
    tab: activeTab 
  })

  // Debug logging
  useEffect(() => {
    console.log('📰 Feeds Page Debug:', {
      bowers: bowers.length,
      selectedBowerId,
      articles: articles.length,
      articlesLoading,
      error,
      activeTab
    })
  }, [bowers.length, selectedBowerId, articles.length, articlesLoading, error, activeTab])

  // Group articles by date
  const groupedArticles = articles.reduce((groups, article) => {
    const dateKey = article.publishedAt.toLocaleDateString(
      language === 'ja' ? 'ja-JP' : 'en-US',
      { month: 'long', day: 'numeric' }
    )
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(article)
    return groups
  }, {} as { [key: string]: typeof articles })

  // Initialize date group states
  useEffect(() => {
    const dateKeys = Object.keys(groupedArticles)
    if (dateKeys.length > 0) {
      const newDateGroups: { [key: string]: boolean } = {}
      dateKeys.forEach(date => {
        newDateGroups[date] = allDatesOpen
      })
      setDateGroups(prev => {
        // 既存の状態と比較して変更が必要な場合のみ更新
        const hasChanges = dateKeys.some(date => prev[date] !== allDatesOpen) || 
                          Object.keys(prev).length !== dateKeys.length
        return hasChanges ? newDateGroups : prev
      })
    }
  }, [Object.keys(groupedArticles).join(','), allDatesOpen]) // groupedArticlesの代わりにキーの文字列を使用

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    searchArticles(query)
  }, [searchArticles])

  // Search bar component
  const searchBar = (
    <div className="relative w-full md:w-64">
      <div className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
        🔍
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={t.searchArticles}
        className="w-full pl-8 md:pl-10 pr-8 md:pr-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-base"
        style={{ outline: 'none' }}
        onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
      />
      {searchQuery && (
        <button
          onClick={() => handleSearch('')}
          className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )

  // Handle article click
  const handleArticleClick = useCallback((id: string, url: string) => {
    // Mark as read and open in new tab
    toggleRead(id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [toggleRead])

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop
      >= document.documentElement.offsetHeight - 1000
    ) {
      if (hasMore && !articlesLoading) {
        loadMore()
      }
    }
  }, [hasMore, articlesLoading, loadMore])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Toggle date group
  const toggleDateGroup = (date: string) => {
    setDateGroups(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // Toggle all dates
  const toggleAllDates = () => {
    const newState = !allDatesOpen
    setAllDatesOpen(newState)
    const newDateGroups: { [key: string]: boolean } = {}
    Object.keys(groupedArticles).forEach(date => {
      newDateGroups[date] = newState
    })
    setDateGroups(newDateGroups)
  }

  // Check all articles for a date (toggle between all checked and all unchecked)
  const checkAllForDate = (date: string) => {
    const articlesForDate = groupedArticles[date] || []
    const allChecked = articlesForDate.every(article => article.read)
    
    // If all are checked, uncheck all. Otherwise, check all.
    articlesForDate.forEach(article => {
      if (allChecked) {
        // Uncheck all
        if (article.read) {
          toggleRead(article.id)
        }
      } else {
        // Check all
        if (!article.read) {
          toggleRead(article.id)
        }
      }
    })
  }

  if (bowersLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center py-12">
              <LoadingAnimation />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Show empty state if no bowers
  if (bowers.length === 0) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
              {t.feeds}
            </h1>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🐣</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {language === 'ja' ? 'フィードがまだありません' : 'No feeds yet'}
                </h2>
                <p className="text-gray-500 mb-6">
                  {language === 'ja' 
                    ? 'バウアーを作成して、AIにフィードを見つけてもらいましょう'
                    : 'Create a bower and let AI find feeds for you'
                  }
                </p>
                <button 
                  onClick={() => router.push('/bowers/new')}
                  className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  {language === 'ja' ? '+ バウアーを作成' : '+ Create Bower'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout searchBar={searchBar}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="hidden md:block py-4">
            <h1 className="text-xl font-bold mb-2" style={{ color: '#14b8a6' }}>
              {t.feeds}
            </h1>
            <p className="text-sm" style={{ color: '#f59e0b' }}>
              {language === 'ja' 
                ? 'バウアーから集めた記事を読んで、ひよこを育てましょう'
                : 'Read articles from your bowers and grow your chick'
              }
            </p>
          </div>

          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold" style={{ color: '#14b8a6' }}>{t.feeds}</h1>
          </div>

          {/* Tabs - Centered */}
          <div className="mb-6 relative">
            <div className="absolute bottom-0 left-0 right-0 border-b-2 border-gray-200"></div>
            <div className="flex justify-center relative">
              <div className="inline-flex">
                {[
                  { key: 'all' as const, label: t.allArticles },
                  { key: 'important' as const, label: t.importantArticles },
                  { key: 'liked' as const, label: t.likedArticles }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-3 font-semibold transition-all text-base whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-b-2 -mb-0.5'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={activeTab === tab.key ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Bower Selector */}
            <div className="flex gap-2">
              <select
                value={selectedBowerId}
                onChange={(e) => setSelectedBowerId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">{t.allBowers}</option>
                {bowers.map(bower => (
                  <option key={bower.id} value={bower.id}>
                    🪺 {bower.name}
                  </option>
                ))}
              </select>
              
              {/* Refresh Button */}
              <button
                onClick={async () => {
                  if (selectedBowerId === 'all') return;
                  try {
                    const { feedApi } = await import('@/lib/api');
                    await feedApi.fetchBowerFeeds(selectedBowerId);
                    // Refresh articles after fetching feeds
                    refresh();
                  } catch (error) {
                    console.error('Failed to refresh feeds:', error);
                  }
                }}
                disabled={selectedBowerId === 'all' || articlesLoading}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                title={language === 'ja' ? 'フィードの記事を更新' : 'Refresh feed articles'}
              >
                <svg
                  className={`w-5 h-5 ${articlesLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
              <button
                onClick={refresh}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                {language === 'ja' ? '再試行' : 'Retry'}
              </button>
            </div>
          )}

          {/* Loading State */}
          {articlesLoading && articles.length === 0 && (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <LoadingAnimation />
                <p className="mt-4 text-gray-600">{t.loadingArticles}</p>
              </div>
            </div>
          )}

          {/* Articles */}
          {!articlesLoading && articles.length === 0 && !error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🐣</div>
              <p className="text-gray-600">{t.noArticles}</p>
            </div>
          )}

          {/* Date Grouped Articles (for 'all' tab) */}
          {activeTab === 'all' && Object.keys(groupedArticles).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedArticles)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([date, dateArticles], index) => (
                <div key={date} className="space-y-4">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer"
                        style={{ backgroundColor: '#14b8a6' }}
                        onClick={() => toggleDateGroup(date)}
                      >
                        <span className={`transform transition-transform text-white text-xs ${dateGroups[date] ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                        <span className="text-sm font-medium text-white">{date}</span>
                        <span className="text-xs text-white opacity-80">({dateArticles.length})</span>
                      </div>
                      
                      {dateGroups[date] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            checkAllForDate(date)
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors"
                          style={{ 
                            color: dateArticles.every(a => a.read) ? '#14b8a6' : '#505050'
                          }}
                        >
                          <span>✓</span>
                          <span>{dateArticles.every(a => a.read) ? (language === 'ja' ? 'チェック済' : 'Checked') : (language === 'ja' ? 'チェック' : 'Check')}</span>
                        </button>
                      )}
                    </div>

                    {/* Toggle All Dates button - only on first date header */}
                    {index === 0 && (
                      <button
                        onClick={toggleAllDates}
                        className="px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        style={{ 
                          backgroundColor: '#505050',
                          color: '#FFFFFF'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#707070'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#505050'}
                      >
                        {allDatesOpen ? t.closeAll : t.openAll}
                      </button>
                    )}
                  </div>

                  {/* Articles for this date */}
                  {dateGroups[date] && (
                    <div className="grid gap-4">
                      {dateArticles.map(article => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          language={language}
                          onArticleClick={handleArticleClick}
                          onToggleRead={toggleRead}
                          onLike={likeArticle}
                          t={{
                            readMore: t.readMore,
                            like: t.like,
                            unlike: t.unlike,
                            checked: t.checked,
                            uncheck: t.uncheck
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Non-grouped Articles (for other tabs) */}
          {activeTab !== 'all' && articles.length > 0 && (
            <div className="grid gap-4">
              {articles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  language={language}
                  onArticleClick={handleArticleClick}
                  onToggleRead={toggleRead}
                  onLike={likeArticle}
                  t={{
                    readMore: t.readMore,
                    like: t.like,
                    unlike: t.unlike,
                    checked: t.checked,
                    uncheck: t.uncheck
                  }}
                />
              ))}
            </div>
          )}

          {/* Load More Button / Loading More */}
          {hasMore && articles.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="text-center">
                <LoadingAnimation />
                <p className="mt-2 text-gray-600">{t.loadingArticles}</p>
              </div>
            </div>
          )}

          {/* Total Count */}
          {total > 0 && (
            <div className="text-center mt-6 text-sm text-gray-500">
              {language === 'ja' 
                ? `${articles.length} / ${total} 件の記事を表示中`
                : `Showing ${articles.length} / ${total} articles`
              }
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}