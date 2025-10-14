'use client'

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import NestSVG from './NestSVG'
import EggSVG from './EggSVG'

interface FloatingKeyword {
  id: string
  text: string
  x: number
  y: number
  color: string
}

interface Egg {
  id: string
  keyword: string
  color: string
}

interface KeywordEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (keywords: string[]) => void
  initialKeywords?: string[]
  title?: string
}

export default function KeywordEditModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialKeywords = [],
  title 
}: KeywordEditModalProps) {
  const { language } = useApp()
  const t = useTranslation(language)
  
  const [floatingKeywords, setFloatingKeywords] = useState<FloatingKeyword[]>([])
  const [eggs, setEggs] = useState<Egg[]>([])
  const [draggedKeyword, setDraggedKeyword] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const nestRef = useRef<HTMLDivElement>(null)

  const colors = [
    '#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#f59e0b', '#DDA0DD', '#98D8C8'
  ]

  // Japanese keywords pool
  const keywordPool = language === 'ja' ? [
    'プログラミング', 'ソーシャルメディア', '映画', 'アプリ開発', 'セキュリティ',
    '教育', 'イノベーション', 'IoT', 'テクノロジー', 'AI', '機械学習', 'デザイン', 
    'スタートアップ', 'データサイエンス', 'クラウド', 'モバイル', 'ウェブ開発', 
    'ブロックチェーン', 'VR', 'AR', 'ゲーム', 'エンターテイメント', 'ビジネス', 
    'マーケティング', '健康', 'フィットネス', '料理', '旅行', 'ファッション', 
    '音楽', '読書', '科学', '環境', 'サステナビリティ', 'アート', '写真'
  ] : [
    'Programming', 'Social Media', 'Movies', 'App Development', 'Security',
    'Education', 'Innovation', 'IoT', 'Technology', 'AI', 'Machine Learning', 
    'Design', 'Startup', 'Data Science', 'Cloud', 'Mobile', 'Web Dev', 
    'Blockchain', 'VR', 'AR', 'Gaming', 'Entertainment', 'Business', 
    'Marketing', 'Health', 'Fitness', 'Cooking', 'Travel', 'Fashion', 
    'Music', 'Reading', 'Science', 'Environment', 'Sustainability', 'Art', 'Photography'
  ]

  // Generate random floating keywords
  const generateRandomKeywords = () => {
    const shuffled = [...keywordPool].sort(() => 0.5 - Math.random())
    const count = Math.floor(Math.random() * 3) + 8 // 8-10 keywords
    const selected = shuffled.slice(0, count)

    const positions: { x: number; y: number }[] = []

    return selected.map((keyword, index) => {
      let x = Math.random() * 500 + 50
      let y = Math.random() * 150 + 30
      let attempts = 0

      // Avoid overlapping
      while (attempts < 30) {
        let hasOverlap = false
        for (const pos of positions) {
          const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2))
          if (distance < 100) {
            hasOverlap = true
            break
          }
        }
        if (!hasOverlap) break
        x = Math.random() * 500 + 50
        y = Math.random() * 150 + 30
        attempts++
      }

      positions.push({ x, y })

      return {
        id: `floating-${Date.now()}-${index}`,
        text: keyword,
        x,
        y,
        color: colors[Math.floor(Math.random() * colors.length)]
      }
    })
  }

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      // Set initial eggs from existing keywords
      const initialEggs = initialKeywords.map((keyword, index) => ({
        id: `initial-${index}`,
        keyword,
        color: colors[index % colors.length]
      }))
      setEggs(initialEggs)
      
      // Generate floating keywords
      setFloatingKeywords(generateRandomKeywords())
    }
  }, [isOpen, initialKeywords])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFloatingKeywords([])
      setEggs([])
      setUserQuery('')
    }
  }, [isOpen])

  const handleQuerySubmit = () => {
    if (!userQuery.trim()) return

    const keywords = userQuery.split(/[,、\s]+/).filter(k => k.trim())
    const existingKeywords = eggs.map(egg => egg.keyword.toLowerCase())

    keywords.forEach(keyword => {
      const trimmedKeyword = keyword.trim()
      if (eggs.length < 8 && trimmedKeyword && !existingKeywords.includes(trimmedKeyword.toLowerCase())) {
        const newEgg: Egg = {
          id: `user-${Date.now()}-${Math.random()}`,
          keyword: trimmedKeyword,
          color: colors[Math.floor(Math.random() * colors.length)]
        }
        setEggs(prev => [...prev, newEgg])
        existingKeywords.push(trimmedKeyword.toLowerCase())
      }
    })

    setUserQuery('')
  }

  const handleKeywordClick = (keyword: FloatingKeyword) => {
    if (eggs.length >= 8) return

    const existingKeywords = eggs.map(egg => egg.keyword.toLowerCase())
    if (existingKeywords.includes(keyword.text.toLowerCase())) return

    setFloatingKeywords(prev => prev.filter(k => k.id !== keyword.id))

    const newEgg: Egg = {
      id: keyword.id,
      keyword: keyword.text,
      color: keyword.color
    }
    setEggs(prev => [...prev, newEgg])
  }

  const handleEggClick = (eggId: string) => {
    const egg = eggs.find(e => e.id === eggId)
    if (!egg) return

    setEggs(prev => prev.filter(e => e.id !== eggId))

    const floatingKeyword: FloatingKeyword = {
      id: egg.id,
      text: egg.keyword,
      x: Math.random() * 400 + 50,
      y: Math.random() * 100 + 30,
      color: egg.color
    }
    setFloatingKeywords(prev => [...prev, floatingKeyword])
  }

  const handleSave = () => {
    onSave(eggs.map(e => e.keyword))
    onClose()
  }

  const handleRefresh = () => {
    const userKeywords = floatingKeywords.filter(k => !k.id.startsWith('floating-'))
    const newRandomKeywords = generateRandomKeywords()
    setFloatingKeywords([...userKeywords, ...newRandomKeywords])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-amber-100">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🪺</div>
            <h2 className="text-xl font-bold text-gray-800">
              {title || (language === 'ja' ? 'キーワード編集' : 'Edit Keywords')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-0">
          {/* Sky Area with Floating Keywords */}
          <div
            className="relative h-[250px] overflow-hidden"
            style={{
              background: `linear-gradient(to bottom, #87CEEB 0%, #B0E0E6 50%, #E0F6FF 100%)`
            }}
          >
            {/* Sun/Refresh Button */}
            <button
              onClick={handleRefresh}
              className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-20 bg-white bg-opacity-20 backdrop-blur-sm"
              title={language === 'ja' ? 'キーワードを更新' : 'Refresh keywords'}
            >
              <div className="text-2xl">☀️</div>
            </button>

            {/* Clouds */}
            <div className="absolute top-6 left-12 w-20 h-10 bg-white rounded-full opacity-75 animate-pulse" style={{ animationDelay: '0s' }}></div>
            <div className="absolute top-8 right-20 w-24 h-12 bg-white rounded-full opacity-60 animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-4 left-1/2 w-16 h-8 bg-white rounded-full opacity-70 animate-pulse" style={{ animationDelay: '4s' }}></div>

            {/* Birds */}
            <div className="absolute top-12 left-1/4 text-xl animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}>🐦</div>
            <div className="absolute top-16 right-1/3 text-xl animate-bounce" style={{ animationDelay: '3s', animationDuration: '5s' }}>🐦</div>

            {/* Floating Keywords */}
            {floatingKeywords.map((keyword) => (
              <div
                key={keyword.id}
                onClick={() => handleKeywordClick(keyword)}
                className="absolute cursor-pointer hover:scale-110 transition-transform animate-bounce select-none"
                style={{
                  left: `${keyword.x}px`,
                  top: `${keyword.y}px`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: '3s'
                }}
              >
                <div
                  className="px-4 py-2 rounded-2xl text-white font-medium shadow-lg text-sm border border-white border-opacity-30"
                  style={{ backgroundColor: keyword.color }}
                >
                  {keyword.text}
                </div>
              </div>
            ))}
          </div>

          {/* Nest Area */}
          <div
            className="relative h-[200px] flex items-center justify-center"
            style={{ backgroundColor: '#E0F6FF' }}
            ref={nestRef}
          >
            {/* Nest SVG */}
            <div className="relative hover:scale-105 transition-transform duration-300">
              <div className="w-80 h-50 relative">
                <NestSVG className="drop-shadow-lg" />

                {/* Eggs in Nest */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-72 h-24 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {eggs.map((egg, index) => {
                      // Calculate position in a circular/clustered pattern
                      const angle = (index / Math.max(eggs.length, 1)) * Math.PI * 2
                      const seed = egg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                      const radius = 30 + (seed % 40)
                      const x = Math.cos(angle) * radius
                      const y = Math.sin(angle) * radius * 0.5 // Flatten vertically
                      const scale = 0.85 + (seed % 30) / 100
                      const rotation = (seed % 50) - 25

                      return (
                        <div
                          key={egg.id}
                          className="absolute transition-transform animate-pulse"
                          style={{
                            left: `calc(50% + ${x}px)`,
                            top: `calc(50% + ${y}px)`,
                            transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                            zIndex: Math.floor(50 - y),
                            animationDelay: `${index * 0.3}s`,
                            animationDuration: '2s'
                          }}
                        >
                          <EggSVG
                            color={egg.color}
                            onClick={() => handleEggClick(egg.id)}
                            title={egg.keyword}
                            className="hover:scale-125 transition-transform duration-200"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-6 bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && userQuery.trim()) {
                    e.preventDefault()
                    handleQuerySubmit()
                  }
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#14b8a6] focus:border-transparent text-gray-600"
                placeholder={language === 'ja' ? '例: AI、プログラミング、デザイン' : 'e.g., AI, Programming, Design'}
              />
              <button
                onClick={handleQuerySubmit}
                disabled={!userQuery.trim()}
                className="px-6 py-3 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0f766e] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
              >
                &gt;
              </button>
            </div>

            {/* Selected Keywords Display */}
            {eggs.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {eggs.map((egg) => (
                    <span
                      key={egg.id}
                      className="px-3 py-1 rounded-full text-white text-sm font-medium cursor-pointer hover:opacity-80 border border-white border-opacity-30"
                      style={{ backgroundColor: egg.color }}
                      onClick={() => handleEggClick(egg.id)}
                    >
                      {egg.keyword} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setEggs([])
                  setFloatingKeywords(generateRandomKeywords())
                  setUserQuery('')
                }}
                className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-base"
              >
                {language === 'ja' ? 'リセット' : 'Reset'}
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0f766e] transition-colors text-base"
              >
                {language === 'ja' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}