'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import { KEYWORD_COLORS, getKeywordColor } from '@/lib/colors'
import NestSVG from './NestSVG'
import EggSVG from './EggSVG'

// Cloud component for modal animation
const ModalCloudSVG = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size * 0.6}
    viewBox="0 0 100 60"
    className="fill-white opacity-80"
  >
    <ellipse cx="25" cy="35" rx="15" ry="10" />
    <ellipse cx="40" cy="30" rx="20" ry="15" />
    <ellipse cx="60" cy="35" rx="18" ry="12" />
    <ellipse cx="75" cy="40" rx="12" ry="8" />
  </svg>
)

// Bird component for modal animation
const ModalBirdSVG = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size * 0.8}
    viewBox="0 0 100 80"
    className="fill-gray-600 opacity-70"
  >
    {/* Bird body - made even thicker */}
    <ellipse cx="50" cy="40" rx="35" ry="20" />
    {/* Bird wings - larger and thicker */}
    <path d="M15 35 Q5 30, 10 45 Q15 55, 35 50 Q30 35, 15 35 Z" />
    <path d="M85 35 Q95 30, 90 45 Q85 55, 65 50 Q70 35, 85 35 Z" />
    {/* Bird head - larger */}
    <circle cx="15" cy="35" r="12" />
    {/* Bird beak */}
    <polygon points="3,35 -2,33 3,37" className="fill-orange-400" />
    {/* Bird eye */}
    <circle cx="17" cy="32" r="3" className="fill-white" />
    <circle cx="18" cy="31" r="2" className="fill-gray-800" />
    {/* Bird tail - larger */}
    <path d="M85 40 Q95 35, 100 40 Q95 50, 85 45 Z" />
  </svg>
)

// Balloon component
const BalloonSVG = ({ size, color, onClick }: { size: number, color: string, onClick: () => void }) => (
  <div 
    className="cursor-pointer hover:scale-110 transition-transform"
    onClick={onClick}
  >
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 100 120"
      className="drop-shadow-sm"
    >
      <ellipse cx="50" cy="40" rx="25" ry="35" fill={color} opacity="0.8" />
      <ellipse cx="50" cy="35" rx="20" ry="28" fill={color} opacity="0.6" />
      <line x1="50" y1="75" x2="50" y2="100" stroke="#8B4513" strokeWidth="2" />
      <polygon points="45,100 55,100 50,110" fill="#8B4513" />
    </svg>
  </div>
)

interface ModalCloud {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

interface ModalBird {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

interface Balloon {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
}

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

  const [userQuery, setUserQuery] = useState('')
  const [modalClouds, setModalClouds] = useState<ModalCloud[]>([])
  const [modalBirds, setModalBirds] = useState<ModalBird[]>([])
  const [balloons, setBalloons] = useState<Balloon[]>([])
  const nestRef = useRef<HTMLDivElement>(null)

  const colors = KEYWORD_COLORS



  // Generate random floating keywords
  const generateRandomKeywords = useCallback(() => {
    // Define keyword pool inside callback to avoid dependency issues
    const pool = language === 'ja' ? [
      'プログラミング', 'SNS', '映画', 'アプリ開発', 'セキュリティ',
      '教育', 'イノベーション', 'IoT', 'テクノロジー', 'AI', '機械学習', 'デザイン', 
      'スタートアップ', 'データ分析', 'クラウド', 'モバイル', 'ウェブ開発', 
      'ブロックチェーン', 'VR', 'AR', 'ゲーム', '娯楽', 'ビジネス', 
      'マーケティング', '健康', 'フィットネス', '料理', '旅行', 'ファッション', 
      '音楽', '読書', '科学', '環境', '持続可能性', 'アート', '写真'
    ] : [
      'Programming', 'Social Media', 'Movies', 'App Development', 'Security',
      'Education', 'Innovation', 'IoT', 'Technology', 'AI', 'Machine Learning', 
      'Design', 'Startup', 'Data Science', 'Cloud', 'Mobile', 'Web Dev', 
      'Blockchain', 'VR', 'AR', 'Gaming', 'Entertainment', 'Business', 
      'Marketing', 'Health', 'Fitness', 'Cooking', 'Travel', 'Fashion', 
      'Music', 'Reading', 'Science', 'Environment', 'Sustainability', 'Art', 'Photography'
    ]
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random())
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
        color: getKeywordColor(keyword)
      }
    })
  }, [])

  // Track if modal was just opened to avoid re-initializing
  const wasOpenRef = useRef(false)

  // Initialize when modal opens or reset when closes
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      // Set initial eggs from existing keywords
      const initialEggs = initialKeywords.map((keyword, index) => ({
        id: `initial-${index}`,
        keyword,
        color: getKeywordColor(keyword)
      }))
      setEggs(initialEggs)
      
      // Generate floating keywords
      setFloatingKeywords(generateRandomKeywords())
      wasOpenRef.current = true
    } else if (!isOpen) {
      // Reset when modal closes
      setFloatingKeywords([])
      setEggs([])
      setUserQuery('')
      setModalClouds([])
      setModalBirds([])
      setBalloons([])
      wasOpenRef.current = false
    }
  }, [isOpen])

  // Generate clouds when modal opens
  useEffect(() => {
    if (isOpen) {
      const generateClouds = () => {
        const newClouds: ModalCloud[] = [];
        for (let i = 0; i < 4; i++) {
          newClouds.push({
            id: i,
            top: Math.random() * 40 + 10, // 10% - 50%の位置（画面上部）
            delay: Math.random() * 8, // 0-8秒の遅延
            duration: 15 + Math.random() * 10, // 15-25秒の持続時間
            size: 50 + Math.random() * 40, // 50-90pxのサイズ
          });
        }
        setModalClouds(newClouds);
      };

      const generateBalloons = () => {
        const newBalloons: Balloon[] = [];
        const balloonColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F4A460'];
        for (let i = 0; i < 4; i++) {
          newBalloons.push({
            id: i,
            x: Math.random() * 85 + 5, // 5% - 90%の位置（より広い範囲）
            y: Math.random() * 50 + 10, // 10% - 60%の位置（より広い範囲）
            color: balloonColors[Math.floor(Math.random() * balloonColors.length)],
            size: 25 + Math.random() * 25, // 25-50pxのサイズ
          });
        }
        setBalloons(newBalloons);
      };

      generateClouds();
      generateBalloons();
    }
  }, [isOpen])

  // Generate birds periodically
  useEffect(() => {
    if (!isOpen) return;

    const generateBird = () => {
      const newBird: ModalBird = {
        id: Date.now(),
        top: Math.random() * 40 + 20, // 20% - 60%の位置
        delay: 0,
        duration: 8 + Math.random() * 4, // 8-12秒の持続時間
        size: 25 + Math.random() * 15, // 25-40pxのサイズ
      };

      setModalBirds(prev => [...prev, newBird]);

      // 一定時間後に鳥を削除
      setTimeout(() => {
        setModalBirds(prev => prev.filter(bird => bird.id !== newBird.id));
      }, (newBird.duration + 2) * 1000);
    };

    // 初回生成
    setTimeout(() => generateBird(), 2000);

    // 5-10秒間隔で鳥を生成
    const interval = setInterval(() => {
      generateBird();
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [isOpen])

  // Handle balloon pop
  const handleBalloonPop = (balloonId: number) => {
    setBalloons(prev => prev.filter(balloon => balloon.id !== balloonId));
  }

  const handleQuerySubmit = () => {
    if (!userQuery.trim()) return

    const keywords = userQuery.split(/[,、\s]+/).filter(k => k.trim())
    const existingKeywords = eggs.map(egg => egg.keyword.toLowerCase())

    keywords.forEach(keyword => {
      const trimmedKeyword = keyword.trim()
      
      // Check if already at max limit
      if (eggs.length >= 5) {
        alert(language === 'ja' ? 
          'キーワードは最大5個までです' : 
          'Maximum 5 keywords allowed')
        return
      }
      
      // Check character length (20 characters max)
      if (trimmedKeyword.length > 20) {
        alert(language === 'ja' ? 
          `キーワード「${trimmedKeyword}」は20文字以内で入力してください` : 
          `Keyword "${trimmedKeyword}" must be 20 characters or less`)
        return
      }
      
      if (eggs.length < 5 && trimmedKeyword && !existingKeywords.includes(trimmedKeyword.toLowerCase())) {
        const newEgg: Egg = {
          id: `user-${Date.now()}-${Math.random()}`,
          keyword: trimmedKeyword,
          color: getKeywordColor(trimmedKeyword)
        }
        setEggs(prev => [...prev, newEgg])
        existingKeywords.push(trimmedKeyword.toLowerCase())
      }
    })

    setUserQuery('')
  }

  const handleKeywordClick = (keyword: FloatingKeyword) => {
    if (eggs.length >= 5) {
      alert(language === 'ja' ? 
        'キーワードは最大5個までです' : 
        'Maximum 5 keywords allowed')
      return
    }

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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-amber-100 flex-shrink-0">
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

        {/* Content - Scrollable */}
        <div className="p-0 overflow-y-auto flex-1">
          {/* Sky Area with Floating Keywords */}
          <div
            className="relative h-[250px] overflow-hidden"
            style={{
              background: `linear-gradient(to bottom, #87CEEB 0%, #B0E0E6 50%, #E0F6FF 100%)`
            }}
          >
            {/* Clouds Animation */}
            {modalClouds.map((cloud) => (
              <div
                key={cloud.id}
                className="absolute animate-float-right-slow"
                style={{
                  top: `${cloud.top}%`,
                  left: '-100px',
                  animationDelay: `${cloud.delay}s`,
                  animationDuration: `${cloud.duration}s`,
                }}
              >
                <ModalCloudSVG size={cloud.size} />
              </div>
            ))}

            {/* Birds Animation */}
            {modalBirds.map((bird) => (
              <div
                key={bird.id}
                className="absolute animate-fly-right-slow"
                style={{
                  top: `${bird.top}%`,
                  left: '-60px',
                  animationDelay: `${bird.delay}s`,
                  animationDuration: `${bird.duration}s`,
                }}
              >
                <ModalBirdSVG size={bird.size} />
              </div>
            ))}

            {/* Balloons */}
            {balloons.map((balloon) => (
              <div
                key={balloon.id}
                className="absolute animate-bounce"
                style={{
                  left: `${balloon.x}%`,
                  top: `${balloon.y}%`,
                  animationDuration: '3s',
                }}
              >
                <BalloonSVG 
                  size={balloon.size} 
                  color={balloon.color}
                  onClick={() => handleBalloonPop(balloon.id)}
                />
              </div>
            ))}
            {/* Sun/Refresh Button */}
            <button
              onClick={handleRefresh}
              className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all duration-300 z-20 bg-white bg-opacity-20 backdrop-blur-sm"
              title={language === 'ja' ? 'キーワードを更新' : 'Refresh keywords'}
            >
              <div className="text-2xl">☀️</div>
            </button>






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