'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'

export default function ChickIcon() {
  const [showStats, setShowStats] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isLevelingUp, setIsLevelingUp] = useState(false)
  const [showLevelUpToast, setShowLevelUpToast] = useState(false)
  const [newLevel, setNewLevel] = useState(0)
  const [activeTab, setActiveTab] = useState<'stats' | 'articles'>('articles')
  const { chickStats, language, setChickStats, likedArticles } = useApp()
  const t = useTranslation(language)

  // Developer commands - expose to window for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).chickDebug = {
        // Test jump animation
        testJump: () => {
          setIsAnimating(true)
          setTimeout(() => setIsAnimating(false), 1200)
          console.log('🐣 Testing jump animation...')
        },
        // Test level up animation
        testLevelUp: () => {
          setIsLevelingUp(true)
          setNewLevel(chickStats.level + 1)
          setShowLevelUpToast(true)
          setTimeout(() => setIsLevelingUp(false), 2000)
          setTimeout(() => setShowLevelUpToast(false), 3000)
          console.log('🎉 Testing level up animation...')
        },
        // Add likes (for testing)
        addLikes: (count: number = 1) => {
          const newTotalLikes = chickStats.totalLikes + count
          const newLevel = Math.floor(newTotalLikes / 10) + 1
          setChickStats({
            ...chickStats,
            totalLikes: newTotalLikes,
            experience: newTotalLikes,
            level: newLevel,
            nextLevelExp: newLevel * 10,
            checkedDays: chickStats.checkedDays
          })
          console.log(`❤️ Added ${count} likes. Total: ${newTotalLikes}, Level: ${newLevel}`)
        },
        // Set specific level
        setLevel: (level: number) => {
          const totalLikes = (level - 1) * 10
          setChickStats({
            ...chickStats,
            totalLikes: totalLikes,
            experience: totalLikes,
            level: level,
            nextLevelExp: level * 10,
            checkedDays: chickStats.checkedDays
          })
          console.log(`🐣 Set to level ${level}`)
        },
        // Reset stats
        reset: () => {
          setChickStats({
            totalLikes: 0,
            experience: 0,
            level: 1,
            nextLevelExp: 10,
            checkedDays: 0
          })
          console.log('🔄 Stats reset')
        },
        // Show help
        help: () => {
          console.log(`
🐣 Chick Debug Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
chickDebug.testJump()        - Test jump animation
chickDebug.testLevelUp()     - Test level up animation
chickDebug.addLikes(count)   - Add likes (default: 1)
chickDebug.setLevel(level)   - Set specific level
chickDebug.reset()           - Reset all stats
chickDebug.help()            - Show this help
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Examples:
  chickDebug.addLikes(5)     - Add 5 likes
  chickDebug.setLevel(10)    - Jump to level 10
          `)
        }
      }
      console.log('🐣 Chick debug commands loaded! Type "chickDebug.help()" for available commands.')
    }
  }, [chickStats, setChickStats])

  // Watch for changes in totalLikes and experience to trigger animation
  const [prevLikes, setPrevLikes] = useState(chickStats.totalLikes)
  const [prevExperience, setPrevExperience] = useState(chickStats.experience)
  const [prevLevel, setPrevLevel] = useState(chickStats.level)
  
  useEffect(() => {
    // Check for level up
    if (chickStats.level > prevLevel && prevLevel > 0) {
      setIsLevelingUp(true)
      setNewLevel(chickStats.level)
      setShowLevelUpToast(true)
      
      const timer = setTimeout(() => {
        setIsLevelingUp(false)
      }, 2000)
      
      const toastTimer = setTimeout(() => {
        setShowLevelUpToast(false)
      }, 3000)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(toastTimer)
      }
    }
    setPrevLevel(chickStats.level)
  }, [chickStats.level, prevLevel])
  
  useEffect(() => {
    // Animate if totalLikes increased (not on initial load or page change)
    if (chickStats.totalLikes > prevLikes && prevLikes > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 1200)
      return () => clearTimeout(timer)
    }
    setPrevLikes(chickStats.totalLikes)
  }, [chickStats.totalLikes, prevLikes])

  useEffect(() => {
    // Animate if experience increased (for "read" actions)
    if (chickStats.experience > prevExperience && prevExperience > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 1200)
      return () => clearTimeout(timer)
    }
    setPrevExperience(chickStats.experience)
  }, [chickStats.experience, prevExperience])

  const getChickEmoji = (level: number) => {
    if (level < 5) return '🐣'
    if (level < 10) return '🐤'
    if (level < 20) return '🐥'
    return '🐦'
  }

  return (
    <>
      <button
        onClick={() => setShowStats(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-yellow-400 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-30 ${
          isLevelingUp ? 'level-up-glow' : ''
        }`}
        style={{
          animation: isLevelingUp 
            ? 'levelUpAnimation 2s ease-in-out' 
            : isAnimating 
            ? 'jumpUpTwice 1.2s ease-in-out' 
            : undefined
        }}
      >
        {getChickEmoji(chickStats.level)}
      </button>

      {/* Level Up Toast */}
      {showLevelUpToast && (
        <div 
          className="fixed bottom-24 right-6 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-lg shadow-xl z-40 animate-bounce"
          style={{
            animation: 'slideInUp 0.5s ease-out, fadeOut 0.5s ease-in 2.5s'
          }}
        >
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold">
                {language === 'ja' ? 'レベルアップ！' : 'Level Up!'}
              </p>
              <p className="text-sm">
                {language === 'ja' ? `レベル ${newLevel}` : `Level ${newLevel}`}
              </p>
            </div>
            <span className="text-2xl">{getChickEmoji(newLevel)}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes jumpUpTwice {
          0% {
            transform: translateY(0);
          }
          15% {
            transform: translateY(-30px);
          }
          25% {
            transform: translateY(-40px);
          }
          35% {
            transform: translateY(-30px);
          }
          50% {
            transform: translateY(0);
          }
          65% {
            transform: translateY(-30px);
          }
          75% {
            transform: translateY(-40px);
          }
          85% {
            transform: translateY(-30px);
          }
          100% {
            transform: translateY(0);
          }
        }

        @keyframes levelUpAnimation {
          0% {
            transform: scale(1) rotate(0deg);
          }
          20% {
            transform: scale(1.5) rotate(10deg);
          }
          40% {
            transform: scale(1.3) rotate(-10deg);
          }
          60% {
            transform: scale(1.5) rotate(10deg);
          }
          80% {
            transform: scale(1.3) rotate(-10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        .level-up-glow {
          box-shadow: 0 0 20px 5px rgba(255, 215, 0, 0.8),
                      0 0 40px 10px rgba(255, 165, 0, 0.6),
                      0 0 60px 15px rgba(255, 140, 0, 0.4);
        }
      `}</style>

      {showStats && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowStats(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{t.chickLevel} {chickStats.level}</h3>
              <button
                onClick={() => setShowStats(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-6xl mb-2">
                {getChickEmoji(chickStats.level)}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab('articles')}
                className={`flex-1 py-2 px-4 font-medium transition-colors ${
                  activeTab === 'articles'
                    ? 'border-b-2 border-yellow-400 text-yellow-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {language === 'ja' ? `お気に入り(${likedArticles.length})` : `Favorites(${likedArticles.length})`}
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 py-2 px-4 font-medium transition-colors ${
                  activeTab === 'stats'
                    ? 'border-b-2 border-yellow-400 text-yellow-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {language === 'ja' ? 'ステータス' : 'Stats'}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'stats' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{t.totalLikes}</span>
                      <span>{chickStats.totalLikes}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{t.checkedDays}</span>
                      <span>{chickStats.checkedDays}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{t.experience}</span>
                      <span>{chickStats.experience} / {chickStats.nextLevelExp}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${(chickStats.experience / chickStats.nextLevelExp) * 100}%`
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t.nextLevel}: {chickStats.nextLevelExp - chickStats.experience}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {likedArticles.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🤍</div>
                      <p className="text-sm">
                        {language === 'ja' ? 'まだいいねした記事がありません' : 'No liked articles yet'}
                      </p>
                    </div>
                  ) : (
                    likedArticles.map((article) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
                              {article.title}
                            </h4>
                            {article.bower && (
                              <span className="text-xs text-blue-600">
                                🪺 {article.bower}
                              </span>
                            )}
                          </div>
                          <span className="text-red-500 ml-2">❤️</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(article.likedAt).toLocaleDateString(
                            language === 'ja' ? 'ja-JP' : 'en-US'
                          )}
                        </p>
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}