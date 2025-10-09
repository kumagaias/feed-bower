'use client'

import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'
import { colors } from '@/styles/colors'

export default function LandingHeader() {
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const { language, setLanguage, setUser } = useApp()
  const t = useTranslation(language)

  const handleGuestLogin = () => {
    setUser({
      id: 'guest',
      email: 'guest@example.com',
      name: 'Guest User',
      isGuest: true
    })
    setShowLogin(false)
  }

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login - in real app, this would call an API
    setUser({
      id: 'user1',
      email: 'user@example.com',
      name: 'Demo User',
      isGuest: false
    })
    setShowLogin(false)
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      alert(language === 'ja' ? 'パスワードが一致しません' : 'Passwords do not match')
      return
    }

    // Mock signup - in real app, this would call an API
    setUser({
      id: Date.now().toString(),
      email: email,
      name: email.split('@')[0],
      isGuest: false
    })
    setShowSignup(false)
  }



  return (
    <>
      <header className="fixed top-0 left-0 right-0 shadow-sm z-50" style={{ backgroundColor: colors.primary, borderBottom: `2px solid ${colors.tertiary}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="relative">
                <div className="text-2xl opacity-20 absolute top-0.5 left-0.5">🪺</div>
                <div className="text-2xl relative z-10">🪺</div>
              </div>
              <span className="text-xl font-bold" style={{ color: '#F5F5DC' }}>Feed Bower</span>
            </Link>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`text-xl transition-all ${language === 'en' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                  title="Switch to English"
                >
                  🇺🇸
                </button>
                <span className="text-white opacity-50">/</span>
                <button
                  onClick={() => setLanguage('ja')}
                  className={`text-xl transition-all ${language === 'ja' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                  title="日本語に切り替え"
                >
                  🇯🇵
                </button>
              </div>
              
              <button
                onClick={() => setShowLogin(true)}
                id="login-button"
                className="px-4 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: colors.accent, color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
              >
                {t.login}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t.login}</h2>
              <button
                onClick={() => setShowLogin(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: colors.primary, color: colors.button.text }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.tertiary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                {t.login}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2" style={{ borderColor: 'var(--color-accent)' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {language === 'ja' ? 'または' : 'or'}
                </span>
              </div>
            </div>

            <button
              onClick={handleEmailLogin}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center space-x-2"
            >
              <span>🔍</span>
              <span>
                {language === 'ja' ? 'Googleでログイン' : 'Login with Google'}
              </span>
            </button>

            {/* Signup Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                {language === 'ja' ? 'アカウントがありませんか？' : "Don't have an account?"}{' '}
                <button
                  onClick={() => {
                    setShowLogin(false)
                    setShowSignup(true)
                  }}
                  className="font-bold hover:opacity-80 transition-opacity"
                  style={{ color: colors.primary }}
                >
                  {language === 'ja' ? 'サインアップ' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {language === 'ja' ? 'サインアップ' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowSignup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ja' ? 'パスワード（確認）' : 'Password (confirm)'}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: colors.accent, color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
              >
                {language === 'ja' ? '登録' : 'Sign Up'}
              </button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                {language === 'ja' ? 'アカウントをお持ちですか？' : 'Already have an account?'}{' '}
                <button
                  onClick={() => {
                    setShowSignup(false)
                    setShowLogin(true)
                  }}
                  className="font-bold hover:opacity-80 transition-opacity"
                  style={{ color: colors.primary }}
                >
                  {language === 'ja' ? 'ログイン' : 'Login'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

    </>
  )
}