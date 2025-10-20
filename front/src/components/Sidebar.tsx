'use client'

import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { useState, useEffect, useRef } from 'react'

export default function Sidebar() {
  const { language, setLanguage } = useApp()
  const { user, logout } = useAuth()
  const t = useTranslation(language)
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      // Redirect is handled in AuthContext
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
      setMenuOpen(false)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const navItems = [
    { href: '/feeds', label: t.feeds, icon: '🐣' },
    { href: '/bowers', label: t.bowers, icon: '🪺' },
  ]

  return (
    <div className="fixed left-0 top-0 h-full w-64 shadow-lg z-50 bg-teal-500 border-r-2 border-gray-600">
      <div className="h-16 flex items-center px-6 relative border-b-2 border-gray-600" ref={menuRef}>
        {user ? (
          <>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-3 w-full hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold bg-green-50 text-teal-500">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-extrabold flex items-center gap-1 text-green-50">
                  <span className="text-lg">🪺</span>
                  <span>Feed Bower</span>
                </p>
                <p className="text-xs text-teal-700">
                  {user.email}
                </p>
              </div>
              <span className="text-sm text-green-50">
                {menuOpen ? '▲' : '▼'}
              </span>
            </button>
            {/* Click Menu */}
            {menuOpen && (
              <div 
                className="absolute top-16 left-0 w-64 shadow-lg rounded-b-lg z-[60] animate-menu-slide bg-teal-500 border-l-2 border-r-2 border-b-2 border-gray-600"
              >
              <div className="p-4 space-y-3">
                {/* Language Switcher */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50">
                  <span className="text-sm font-medium text-teal-500">
                    {language === 'ja' ? '言語' : 'Language'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`text-lg transition-all ${language === 'en' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                      title="Switch to English"
                    >
                      🇺🇸
                    </button>
                    <span className="text-teal-500 opacity-50">/</span>
                    <button
                      onClick={() => setLanguage('ja')}
                      className={`text-lg transition-all ${language === 'ja' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                      title="日本語に切り替え"
                    >
                      🇯🇵
                    </button>
                  </div>
                </div>
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t.loading}
                    </span>
                  ) : (
                    t.logout
                  )}
                </button>
              </div>
            </div>
            )}
          </>
        ) : (
          <Link href="/feeds" className="flex items-center space-x-2">
            <span className="text-2xl">🪺</span>
            <h1 className="text-2xl font-extrabold text-green-50">
              Feed Bower
            </h1>
          </Link>
        )}
      </div>
      
      <div className="p-6">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all hover:bg-green-50 hover:text-teal-500 hover:font-bold ${
                pathname === item.href 
                  ? 'bg-green-50 text-teal-500 font-bold' 
                  : 'text-green-50 font-normal'
              }`}
            >
              <span className="text-xl transition-all">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {!user && (
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-600">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLanguage('en')}
                className={`text-xl transition-all ${language === 'en' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                title="Switch to English"
              >
                🇺🇸
              </button>
              <span className="text-green-50 opacity-50">/</span>
              <button
                onClick={() => setLanguage('ja')}
                className={`text-xl transition-all ${language === 'ja' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                title="日本語に切り替え"
              >
                🇯🇵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}