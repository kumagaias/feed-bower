'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import LandingHeader from '@/components/LandingHeader'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()
  const { language, setDemoMode } = useApp()
  const t = useTranslation(language)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Check for demo mode
  useEffect(() => {
    const demoParam = searchParams.get('demo')
    if (demoParam === 'true') {
      setIsDemoMode(true)
      setDemoMode(true)
    }
  }, [searchParams, setDemoMode])

  // Redirect authenticated users to bowers page
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/bowers')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading overlay while checking auth, but keep the header
  const showLoadingOverlay = isLoading;

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen">
      <LandingHeader />
      
      {/* Loading overlay */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🪺</div>
            <p className="text-lg text-white">{t.loading}</p>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Sky Background with Floating Keywords */}
        <div className="relative" style={{
          background: `
            linear-gradient(to bottom, 
              #87CEEB 0%, 
              #B0E0E6 50%, 
              #E0F6FF 100%
            )
          `,
          minHeight: '500px'
        }}>
          {/* Clouds */}
          <div className="absolute top-8 left-8 w-28 h-16 bg-white rounded-full opacity-75 animate-pulse shadow-sm" style={{ animationDelay: '0s' }}></div>
          <div className="absolute top-12 right-16 w-32 h-18 bg-white rounded-full opacity-60 animate-pulse shadow-sm" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-6 left-1/2 w-24 h-14 bg-white rounded-full opacity-70 animate-pulse shadow-sm" style={{ animationDelay: '4s' }}></div>

          {/* Floating Keywords */}
          <div className="absolute top-20 left-20 px-4 py-3 rounded-2xl text-white font-medium shadow-lg" style={{ backgroundColor: '#4ECDC4' }}>
            {language === 'ja' ? '料理' : 'Cooking'}
          </div>
          <div className="absolute top-32 right-32 px-4 py-3 rounded-2xl text-white font-medium shadow-lg" style={{ backgroundColor: '#f59e0b' }}>
            IoT
          </div>
          <div className="absolute top-16 right-1/4 px-4 py-3 rounded-2xl text-white font-medium shadow-lg" style={{ backgroundColor: '#96CEB4' }}>
            {language === 'ja' ? '科学' : 'Science'}
          </div>
          <div className="absolute top-40 left-1/3 px-4 py-3 rounded-2xl text-white font-medium shadow-lg" style={{ backgroundColor: '#45B7D1' }}>
            {language === 'ja' ? '機械学習' : 'ML'}
          </div>
          <div className="absolute top-48 right-1/3 px-4 py-3 rounded-2xl text-white font-medium shadow-lg" style={{ backgroundColor: '#f59e0b' }}>
            {language === 'ja' ? '教育' : 'Education'}
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <div className="mb-8">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <div className="relative">
                    <div className="text-6xl md:text-7xl opacity-20 absolute top-2 left-2">🪺</div>
                    <div className="text-6xl md:text-7xl relative z-10">🪺</div>
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center" style={{ color: '#003333' }}>
                    {t.title}
                  </h1>
                </div>
                <p className="text-xl md:text-2xl mb-4" style={{ color: '#003333' }}>
                  {t.subtitle}
                </p>
                <p className="text-lg max-w-3xl mx-auto mb-8" style={{ color: '#003333' }}>
                  {t.description}
                </p>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const loginBtn = document.getElementById('login-button') as HTMLButtonElement
                    if (loginBtn) {
                      loginBtn.click()
                    }
                  }}
                  className="px-12 py-4 rounded-lg transition-colors font-semibold text-lg shadow-lg"
                  style={{ backgroundColor: '#f59e0b', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                >
                  {t.getStarted}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nest Section */}
        <div className="relative" style={{ backgroundColor: '#E0F6FF', paddingTop: '60px', paddingBottom: '60px' }}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-8xl mb-4">🪺</div>
            <p className="text-xl font-medium" style={{ color: '#003333' }}>
              {language === 'ja' ? 'キーワードを巣に集めて、あなただけのフィードを作ろう' : 'Collect keywords in your nest and create your own feed'}
            </p>
          </div>
        </div>
        
        {/* Floating Keywords Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-32 left-10 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '0s' }}>📰</div>
          <div className="absolute top-52 right-20 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1s' }}>🔍</div>
          <div className="absolute bottom-40 left-20 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '2s' }}>🤖</div>
          <div className="absolute bottom-20 right-10 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '0.5s' }}>❤️</div>
          <div className="absolute top-72 left-1/2 text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1.5s' }}>🐣</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#003333' }}>
              {language === 'ja' ? '主な機能' : 'Key Features'}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#f59e0b' }}>
              {language === 'ja' 
                ? 'AIを活用した次世代のフィードリーダーで、あなたの情報収集を革新します'
                : 'Revolutionize your information gathering with our AI-powered next-generation feed reader'
              }
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#003333' }}>AI Feed Discovery</h3>
              <p style={{ color: '#f59e0b' }}>
                {language === 'ja' 
                  ? 'キーワードや文章からAIが最適なフィードを見つけます。Amazon Bedrockを活用した高精度な検索機能。'
                  : 'AI finds the perfect feeds from your keywords and phrases using Amazon Bedrock for high-precision search.'
                }
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🪺</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#003333' }}>Bower Organization</h3>
              <p style={{ color: '#f59e0b' }}>
                {language === 'ja'
                  ? '鳥の巣のように情報を整理。直感的なドラッグ&ドロップでキーワードを管理できます。'
                  : 'Organize information like a bird\'s nest with intuitive drag & drop keyword management.'
                }
              </p>
            </div>
            
            <div className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">🐣</div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: '#003333' }}>Grow Your Chick</h3>
              <p style={{ color: '#f59e0b' }}>
                {language === 'ja'
                  ? 'いいねするとひよこが成長。読書習慣を楽しくゲーミフィケーションで継続できます。'
                  : 'Your chick grows as you like articles. Gamification makes reading habits fun and sustainable.'
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section / Footer */}
      <section className="py-20" style={{
        backgroundColor: '#003333'
      }}>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#F5F5DC' }}>
            {language === 'ja' 
              ? '今すぐ始めて、あなただけのフィード体験を'
              : 'Start now and create your personalized feed experience'
            }
          </h2>
          <p className="text-lg mb-8" style={{ color: '#CCCC99' }}>
            {language === 'ja'
              ? 'キーワードや短い文章から、AIが最適なフィードを見つけます。鳥の巣のように情報を整理して、あなたの興味を育てましょう。'
              : 'AI finds the perfect feeds from your keywords and phrases. Organize information like a bird\'s nest and nurture your interests.'
            }
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => {
                const loginBtn = document.getElementById('login-button') as HTMLButtonElement
                if (loginBtn) {
                  loginBtn.click()
                }
              }}
              className="px-12 py-4 rounded-lg transition-colors font-semibold text-lg shadow-lg"
              style={{ backgroundColor: '#f59e0b', color: 'white' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#14b8a6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
            >
              {language === 'ja' ? '始める' : 'Get Started'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🪺</div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}