'use client'

import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors } from '@/styles/colors'
import { useState, useEffect, useRef } from 'react'

export default function Sidebar() {
  const { user, setUser, language, setLanguage } = useApp()
  const t = useTranslation(language)
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    setUser(null)
    window.location.href = '/'
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
    <div className="fixed left-0 top-0 h-full w-64 shadow-lg z-50" style={{ 
      backgroundColor: colors.primary,
      borderRight: `2px solid ${colors.tertiary}`
    }}>
      <div className="h-16 flex items-center px-6 relative" style={{ borderBottom: `2px solid ${colors.tertiary}` }} ref={menuRef}>
        {user ? (
          <>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-3 w-full hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{
                backgroundColor: colors.background.main,
                color: colors.primary
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-extrabold flex items-center gap-1" style={{ color: colors.background.main }}>
                  <span className="text-lg">🪺</span>
                  <span>Feed Bower</span>
                </p>
                <p className="text-xs" style={{ color: colors.secondary }}>
                  {user.isGuest ? (language === 'ja' ? 'ゲスト' : 'Guest') : user.name}
                </p>
              </div>
              <span className="text-sm" style={{ color: colors.background.main }}>
                {menuOpen ? '▲' : '▼'}
              </span>
            </button>
            {/* Click Menu */}
            {menuOpen && (
              <div 
                className="absolute top-16 left-0 w-64 shadow-lg rounded-b-lg z-[60] animate-menu-slide"
                style={{ 
                  backgroundColor: colors.primary,
                  borderLeft: `2px solid ${colors.tertiary}`,
                  borderRight: `2px solid ${colors.tertiary}`,
                  borderBottom: `2px solid ${colors.tertiary}`
                }}
              >
              <div className="p-4 space-y-3">
                {/* Language Switcher */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: colors.background.main }}>
                  <span className="text-sm font-medium" style={{ color: colors.primary }}>
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
                    <span style={{ color: colors.primary, opacity: 0.5 }}>/</span>
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
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: colors.tertiary,
                    color: colors.button.text
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.tertiary}
                >
                  {t.logout}
                </button>
              </div>
            </div>
            )}
          </>
        ) : (
          <Link href="/feeds" className="flex items-center space-x-2">
            <span className="text-2xl">🪺</span>
            <h1 className="text-2xl font-extrabold" style={{ color: colors.background.main }}>
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
              className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all"
              style={pathname === item.href ? {
                backgroundColor: colors.background.main,
                color: colors.primary,
                fontWeight: 'bold'
              } : {
                color: colors.background.main,
                fontWeight: 'normal'
              }}
              onMouseEnter={(e) => {
                if (pathname !== item.href) {
                  e.currentTarget.style.backgroundColor = colors.background.main
                  e.currentTarget.style.color = colors.primary
                  e.currentTarget.style.fontWeight = 'bold'
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== item.href) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = colors.background.main
                  e.currentTarget.style.fontWeight = 'normal'
                }
              }}
            >
              <span 
                className="text-xl transition-all" 
                style={{
                  filter: pathname === item.href 
                    ? 'grayscale(100%) brightness(0) saturate(100%) invert(48%) sepia(79%) saturate(2476%) hue-rotate(146deg) brightness(95%) contrast(97%)'
                    : 'grayscale(100%) brightness(0) saturate(100%) invert(39%) sepia(21%) saturate(1077%) hue-rotate(128deg) brightness(93%) contrast(86%)'
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {!user && (
        <div className="absolute bottom-0 left-0 right-0 p-6" style={{ borderTop: `1px solid ${colors.tertiary}` }}>
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setLanguage('en')}
                className={`text-xl transition-all ${language === 'en' ? 'scale-125 opacity-100' : 'opacity-50 hover:opacity-75'}`}
                title="Switch to English"
              >
                🇺🇸
              </button>
              <span style={{ color: colors.background.main, opacity: 0.5 }}>/</span>
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