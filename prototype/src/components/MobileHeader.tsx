'use client'

import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors } from '@/styles/colors'

interface MobileHeaderProps {
  searchBar?: React.ReactNode
}

export default function MobileHeader({ searchBar }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, setUser, language, setLanguage } = useApp()
  const t = useTranslation(language)
  const pathname = usePathname()

  const handleLogout = () => {
    setUser(null)
    window.location.href = '/'
  }

  const navItems = [
    { href: '/feeds', label: t.feeds, icon: '🐣' },
    { href: '/bowers', label: t.bowers, icon: '🪺' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 shadow-md z-50" style={{ backgroundColor: colors.primary, borderBottom: `2px solid ${colors.tertiary}` }}>
        <div className="flex items-center justify-between h-full px-4 gap-3">
          <Link href="/feeds" className="text-base md:text-xl font-bold flex items-center gap-1 md:gap-2 flex-shrink-0" style={{ color: '#F5F5DC' }}>
            <span className="text-xl md:text-2xl">🪺</span>
            <span>Feed Bower</span>
          </Link>
          
          {/* Search bar in header */}
          {searchBar && (
            <div className="flex-1 max-w-md">
              {searchBar}
            </div>
          )}
          
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 flex-shrink-0"
            style={{ color: '#CCCC99' }}
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className={`h-0.5 bg-current transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`h-0.5 bg-current transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`} />
              <div className={`h-0.5 bg-current transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </header>

      {/* Hamburger Menu */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${
        isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`} onClick={() => setIsMenuOpen(false)}>
        <div className={`fixed right-0 top-0 h-full w-80 shadow-lg transform transition-transform ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`} style={{ backgroundColor: colors.primary }} onClick={(e) => e.stopPropagation()}>
          <div className="p-6 pt-20">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
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

            <div className="mt-8 pt-6" style={{ borderTop: `2px solid ${colors.tertiary}` }}>
              <div className="flex items-center justify-center mb-4">
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
              
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF'
                  }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: '#F5F5DC' }}>{user.name}</p>
                    <button 
                      onClick={handleLogout}
                      className="text-xs py-1 pr-4 transition-colors"
                      style={{ color: '#CCCC99' }}
                    >
                      {t.logout}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button className="w-full px-4 py-2 rounded-lg transition-colors" style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#FFFFFF'
                  }}>
                    {t.login}
                  </button>
                  <button className="w-full px-4 py-2 rounded-lg transition-colors" style={{
                    backgroundColor: '#F5F5DC',
                    color: '#003333'
                  }}>
                    {t.tryAsGuest}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}