'use client'

import { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import DeleteAccountModal from './DeleteAccountModal'


interface MobileHeaderProps {
  searchBar?: React.ReactNode
}

export default function MobileHeader({ searchBar }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { language, setLanguage } = useApp()
  const { user, logout } = useAuth()
  const t = useTranslation(language)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      // Redirect is handled in AuthContext
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
      setIsMenuOpen(false)
    }
  }

  const navItems = [
    { href: '/feeds', label: t.feeds, icon: '🐣' },
    { href: '/bowers', label: t.bowers, icon: '🪺' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 shadow-md z-50 bg-teal-500 border-b-2 border-gray-600">
        <div className="flex items-center justify-between h-full px-4 gap-3">
          <Link href="/feeds" className="text-base md:text-xl font-bold flex items-center gap-1 md:gap-2 flex-shrink-0 text-green-50">
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
            className="p-2 flex-shrink-0 text-green-200"
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
        <div className={`fixed right-0 top-0 h-full w-80 shadow-lg transform transition-transform bg-teal-500 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`} onClick={(e) => e.stopPropagation()}>
          <div className="p-6 pt-20">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
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

            <div className="mt-8 pt-6 border-t-2 border-gray-600">
              <div className="flex items-center justify-center mb-4">
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
              
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-amber-500 text-white">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-50">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {isLoggingOut ? t.loading : t.logout}
                  </button>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false)
                      setShowDeleteModal(true)
                    }}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
                  >
                    {language === 'ja' ? 'アカウント削除' : 'Delete Account'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link 
                    href="/"
                    className="w-full px-4 py-2 rounded-lg transition-colors bg-amber-500 text-white text-center block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t.login}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
      />
    </>
  )
}