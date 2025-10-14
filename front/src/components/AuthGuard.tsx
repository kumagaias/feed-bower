'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'

interface AuthGuardProps {
  children: React.ReactNode
}

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/']

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const { language } = useApp()
  const t = useTranslation(language)

  useEffect(() => {
    // Don't redirect if still loading or on public routes
    if (isLoading || PUBLIC_ROUTES.includes(pathname)) {
      return
    }

    // Redirect to home if not authenticated
    if (!isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, pathname, router])

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-main)]">
        <div className="text-center">
          <div className="animate-bounce text-4xl mb-4">🐣</div>
          <p className="text-[var(--color-text-muted)]">{t.loading}</p>
        </div>
      </div>
    )
  }

  // Show login redirect message for protected routes
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background-main)]">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-[var(--color-text-muted)] mb-4">認証が必要です</p>
          <button
            onClick={() => router.push('/')}
            className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-md hover:bg-[var(--color-secondary)] transition-colors"
          >
            {t.login}
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}