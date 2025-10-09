'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'

export default function LikedPage() {
  const { language, chickStats, setChickStats, user } = useApp()
  const t = useTranslation(language)
  const router = useRouter()

  // Redirect to home if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  // Mock liked articles data
  const [likedArticles, setLikedArticles] = useState([
    {
      id: '2',
      feedId: 'ai-news',
      title: 'AI技術の最新動向',
      content: '人工知能の分野では、大規模言語モデルの進歩が続いています。特にマルチモーダルAIの発展により、テキスト、画像、音声を統合的に処理できるシステムが実用化されています...',
      url: 'https://example.com/ai-trends',
      publishedAt: new Date('2024-10-02'),
      liked: true,
      bower: 'AI',
      likedAt: new Date('2024-10-03')
    }
  ])

  const handleUnlike = (articleId: string) => {
    setLikedArticles(prev => prev.filter(article => article.id !== articleId))
    
    // Update chick stats
    setChickStats({
      ...chickStats,
      totalLikes: Math.max(0, chickStats.totalLikes - 1),
      experience: Math.max(0, chickStats.experience - 1)
    })
  }

  const getChickEmoji = (level: number) => {
    if (level < 5) return '🐣'
    if (level < 10) return '🐤'
    if (level < 20) return '🐥'
    return '🐦'
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="hidden md:block text-center py-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#003333' }}>
              {t.liked} ❤️
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--color-accent)' }}>
              {language === 'ja' 
                ? 'お気に入りの記事でひよこを育て、読書習慣を楽しく継続しましょう'
                : 'Grow your chick with favorite articles and enjoy sustainable reading habits'
              }
            </p>
          </div>

          <div className="mb-8 md:hidden">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="text-4xl opacity-20 absolute top-1 left-1">❤️</div>
                <div className="text-4xl relative z-10">❤️</div>
              </div>
              <h1 className="text-3xl font-bold" style={{ color: '#003333' }}>{t.liked}</h1>
            </div>
          </div>

        {likedArticles.length > 0 ? (
          <div className="space-y-6">
            {likedArticles.map((article) => (
              <article
                key={article.id}
                className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-blue-600 font-medium">
                        🪺 {article.bower}
                      </span>
                      <span className="text-sm text-gray-500">
                        {article.publishedAt.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}
                      </span>
                      <span className="text-sm text-red-500">
                        ❤️ {article.likedAt.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US')}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-3">
                      {article.title}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {article.content}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t.readMore} →
                  </a>
                  
                  <button
                    onClick={() => handleUnlike(article.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <span>❤️</span>
                    <span>{t.unlike}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {getChickEmoji(chickStats.level)}
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {language === 'ja' ? 'お気に入りの記事がありません' : 'No liked articles yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {language === 'ja' 
                ? 'フィードで記事にいいねをして、ひよこを育てましょう'
                : 'Like articles in feeds to grow your chick'
              }
            </p>
            
            {/* Chick Growth Guide */}
            <div className="bg-yellow-50 rounded-lg p-6 max-w-md mx-auto">
              <h4 className="text-lg font-semibold text-yellow-800 mb-3">
                {language === 'ja' ? 'ひよこの成長' : 'Chick Growth'}
              </h4>
              <div className="space-y-2 text-sm text-yellow-700">
                <div className="flex items-center justify-between">
                  <span>🐣 {language === 'ja' ? 'ひよこ' : 'Chick'}</span>
                  <span>0-4 {t.totalLikes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🐤 {language === 'ja' ? '若鳥' : 'Young Bird'}</span>
                  <span>5-9 {t.totalLikes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🐥 {language === 'ja' ? '成鳥' : 'Adult Bird'}</span>
                  <span>10-19 {t.totalLikes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🐦 {language === 'ja' ? '立派な鳥' : 'Majestic Bird'}</span>
                  <span>20+ {t.totalLikes}</span>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
    </Layout>
  )
}