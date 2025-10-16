'use client'

import { useEffect } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import ChickIcon from './ChickIcon'
import Breadcrumb from './Breadcrumb'
import AuthErrorMessage from './AuthErrorMessage'


interface LayoutProps {
  children: React.ReactNode
  searchBar?: React.ReactNode
}

export default function Layout({ children, searchBar }: LayoutProps) {
  const { isMobile, setIsMobile, language } = useApp()
  const t = useTranslation(language)
  const pathname = usePathname()

  const getPageTitle = () => {
    if (pathname.startsWith('/feeds')) return t.feeds
    if (pathname.startsWith('/bowers/new')) return language === 'ja' ? 'バウアー作成' : 'Create Bower'
    if (pathname.startsWith('/bowers/edit')) return language === 'ja' ? 'バウアー編集' : 'Edit Bower'
    if (pathname.startsWith('/bowers/preview')) return language === 'ja' ? 'プレビュー' : 'Preview'
    if (pathname.startsWith('/bowers')) return t.bowers
    if (pathname.startsWith('/liked')) return t.liked
    return 'Feed Bower'
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  return (
    <div className="min-h-screen bg-green-50">
      {isMobile ? (
        <>
          <MobileHeader searchBar={searchBar} />
          <main className="pt-16 pb-20">
            {children}
          </main>
        </>
      ) : (
        <>
          <Sidebar />
          <header className="fixed top-0 left-0 right-0 h-16 shadow-sm z-40 bg-teal-500 border-b-2 border-gray-600">
            <div className="flex items-center justify-between h-full px-6 ml-64">
              <Breadcrumb />
              {searchBar && (
                <div className="ml-auto">
                  {searchBar}
                </div>
              )}
            </div>
          </header>
          <div className="pt-16">
            <main className="flex-1 ml-64">
              {children}
            </main>
          </div>
        </>
      )}
      <ChickIcon />
      <AuthErrorMessage />
    </div>
  )
}