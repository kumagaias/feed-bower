'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'

import { Suspense } from 'react'

function BreadcrumbContent() {
  const pathname = usePathname()
  const router = useRouter()
  const { language, bowers } = useApp()

  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const getBreadcrumbs = () => {
    const crumbs: Array<{ label: string; path?: string }> = []

    if (pathname.startsWith('/feeds')) {
      crumbs.push({
        label: language === 'ja' ? 'フィード' : 'Feeds',
        path: '/feeds'
      })
    } else if (pathname.startsWith('/bowers')) {
      crumbs.push({
        label: language === 'ja' ? 'バウアー' : 'Bowers',
        path: '/bowers'
      })

      if (pathname === '/bowers/new') {
        crumbs.push({
          label: language === 'ja' ? '作成' : 'Create'
        })
      } else if (pathname.startsWith('/bowers/preview')) {
        crumbs.push({
          label: language === 'ja' ? 'プレビュー' : 'Preview'
        })
      } else if (pathname.startsWith('/bowers/edit')) {
        crumbs.push({
          label: language === 'ja' ? '編集' : 'Edit'
        })
      }
    } else if (pathname.startsWith('/liked')) {
      crumbs.push({
        label: language === 'ja' ? 'いいね' : 'Liked',
        path: '/liked'
      })
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center space-x-2">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <span className="text-sm text-green-50 opacity-50">&gt;</span>
          )}
          {crumb.path ? (
            <button
              onClick={() => router.push(crumb.path!)}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="text-sm font-medium text-green-50">
                {crumb.label}
              </span>
            </button>
          ) : (
            <span className="text-sm font-medium text-green-50">
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

export default function Breadcrumb() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BreadcrumbContent />
    </Suspense>
  )
}